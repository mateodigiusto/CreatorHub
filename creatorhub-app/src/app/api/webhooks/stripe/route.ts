/**
 * POST /api/webhooks/stripe — Phase 6 org-level rewrite (STAGED).
 *
 * Replaces the legacy user-level handler at src/app/api/webhooks/stripe/route.ts.
 * The legacy handler stays in tree until the Phase 6 cutover (see
 * docs/plans/agency-clients-phase-6-NOTES.md for the move order).
 *
 * Idempotency
 *   We `INSERT … ON CONFLICT (id) DO NOTHING RETURNING id` into
 *   `stripe_events`. Zero rows returned ⇒ duplicate delivery ⇒ ack with
 *   {received: true, duplicate: true} and skip the body handlers. If a
 *   handler throws, we `DELETE` the event row so Stripe's retry actually
 *   re-runs us; otherwise the row stays and dedups future deliveries.
 *
 * Target row
 *   `organizations`, not `profiles`. The org is resolved via:
 *     1. session.metadata.organization_id (always set by the new
 *        /api/stripe/checkout route)
 *     2. stripe_customer_id ⇒ `organizations.stripe_customer_id` lookup
 *        (covers Customer-Portal-originated subscription updates and any
 *        manual subscriptions created in Stripe Dashboard).
 *
 * Audit history
 *   We mirror the resolved state into the legacy `subscriptions` table
 *   for one release window — organization_id set, user_id null. The
 *   CHECK constraints on the legacy table still require plan ∈
 *   ('standard','pro') and cycle ∈ ('monthly','annual'), so we map the
 *   new org plans (`starter|pro|scale`) to the legacy values
 *   (`pro→pro`, else `standard`) until 0037 finalizes.
 *
 * Status semantics
 *   - invoice.payment_failed sets `past_due` unless the row is already
 *     canceled / incomplete_expired (those are terminal).
 *   - invoice.payment_succeeded restores `active` only if the row was
 *     `past_due`. We do NOT clobber `trialing` or `canceled` here.
 *   - customer.subscription.deleted sets plan='free',
 *     subscription_status='canceled', nulls stripe_subscription_id +
 *     current_period_end.
 *   - customer.subscription.created|updated mirrors price → plan/cycle
 *     via orgPlanCycleFromPriceId. Unknown price IDs are logged and the
 *     plan column is left untouched (we never guess).
 *
 * Per AGENTS.md: webhook handlers run service-role + outside any DB
 * transaction (never inside withAudit). All audit_log writes happen via
 * `audit()` between DB writes / Stripe SDK calls.
 */

import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { sql } from "drizzle-orm";

import { dbInternal } from "@/db";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import {
  mapStripeSubscriptionStatus,
  orgPlanCycleFromPriceId,
  type Cycle,
  type PaidPlan,
  type SubscriptionStatus,
} from "@/lib/stripe/org-plan-map";

type OrgRow = {
  id: string;
  plan: "free" | PaidPlan;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const TERMINAL_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  "canceled",
  "incomplete_expired",
]);

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signingSecret) {
    log.error("stripe.webhook.signing_secret_missing", new Error("STRIPE_WEBHOOK_SECRET unset"));
    return NextResponse.json({ error: "webhook_misconfigured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, signingSecret);
  } catch (err) {
    log.warn("stripe.webhook.signature_invalid", { error: String(err) });
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const inserted = (await dbInternal.execute(sql`
    insert into public.stripe_events (id, type, payload)
    values (${event.id}, ${event.type}, ${JSON.stringify(event)}::jsonb)
    on conflict (id) do nothing
    returning id
  `)) as unknown as Array<{ id: string }>;
  if (inserted.length === 0) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
  } catch (err) {
    log.error("stripe.webhook.handler_failed", err as Error, {
      event_id: event.id,
      event_type: event.type,
    });
    await dbInternal.execute(sql`
      delete from public.stripe_events where id = ${event.id}
    `);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function resolveOrg(args: {
  metadataOrgId?: string | null;
  stripeCustomerId?: string | null;
  eventId: string;
}): Promise<OrgRow | null> {
  const { metadataOrgId, stripeCustomerId, eventId } = args;
  if (metadataOrgId) {
    const rows = (await dbInternal.execute(sql`
      select id, plan, subscription_status, stripe_customer_id, stripe_subscription_id
      from public.organizations
      where id = ${metadataOrgId}
      limit 1
    `)) as unknown as OrgRow[];
    if (rows.length > 0) return rows[0];
  }
  if (stripeCustomerId) {
    const rows = (await dbInternal.execute(sql`
      select id, plan, subscription_status, stripe_customer_id, stripe_subscription_id
      from public.organizations
      where stripe_customer_id = ${stripeCustomerId}
      limit 1
    `)) as unknown as OrgRow[];
    if (rows.length > 0) return rows[0];
  }
  log.warn("stripe.webhook.org_unresolved", {
    event_id: eventId,
    metadata_org_id: metadataOrgId,
    stripe_customer_id: stripeCustomerId,
  });
  return null;
}

function legacyPlan(plan: PaidPlan): "standard" | "pro" {
  return plan === "pro" ? "pro" : "standard";
}

async function mirrorSubscriptionAudit(args: {
  orgId: string;
  customerId: string;
  subscriptionId: string;
  plan: PaidPlan;
  cycle: Cycle;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  const { orgId, customerId, subscriptionId, plan, cycle, status, currentPeriodEnd, cancelAtPeriodEnd } = args;
  const mappedPlan = legacyPlan(plan);
  await dbInternal.execute(sql`
    insert into public.subscriptions (
      organization_id, user_id, stripe_customer_id, stripe_subscription_id,
      plan, cycle, status, current_period_end, cancel_at_period_end
    ) values (
      ${orgId}, null, ${customerId}, ${subscriptionId},
      ${mappedPlan}, ${cycle}, ${status},
      ${currentPeriodEnd ? currentPeriodEnd.toISOString() : null}, ${cancelAtPeriodEnd}
    )
    on conflict (stripe_subscription_id) do update set
      organization_id = excluded.organization_id,
      stripe_customer_id = excluded.stripe_customer_id,
      plan = excluded.plan,
      cycle = excluded.cycle,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      updated_at = now()
  `);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const metadataOrgId =
    (session.metadata?.organization_id ?? session.client_reference_id) as string | undefined;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!metadataOrgId || !customerId) {
    log.warn("stripe.webhook.checkout_missing_ids", {
      session_id: session.id,
      organization_id: metadataOrgId,
      customer_id: customerId,
    });
    return;
  }

  /* Persist the customer id on the organization so subsequent checkouts +
     portal sessions reuse it. */
  await dbInternal.execute(sql`
    update public.organizations
    set stripe_customer_id = ${customerId}, updated_at = now()
    where id = ${metadataOrgId} and (stripe_customer_id is null or stripe_customer_id = ${customerId})
  `);

  if (subscriptionId) {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionUpsert(sub);
  }

  await audit(metadataOrgId, {
    actor: "webhook",
    action: "subscription.checkout_completed",
    targetType: "organization",
    targetId: metadataOrgId,
    metadata: { customer_id: customerId, subscription_id: subscriptionId ?? null },
  });
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
  const metadataOrgId = sub.metadata?.organization_id as string | undefined;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const org = await resolveOrg({
    metadataOrgId,
    stripeCustomerId: customerId,
    eventId: sub.id,
  });
  if (!org) return;

  const priceId = sub.items.data[0]?.price?.id ?? null;
  const mapping = orgPlanCycleFromPriceId(priceId);
  if (!mapping) {
    log.warn("stripe.webhook.unknown_price_id", {
      subscription_id: sub.id,
      price_id: priceId,
    });
  }

  const item = sub.items.data[0];
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  const status = mapStripeSubscriptionStatus(sub.status);

  /* Write the org row. Plan is only updated when we recognized the price
     ID; otherwise we leave whatever plan was previously set so a stray
     foreign price never silently downgrades a customer. */
  if (mapping) {
    await dbInternal.execute(sql`
      update public.organizations
      set plan = ${mapping.plan},
          stripe_customer_id = ${customerId},
          stripe_subscription_id = ${sub.id},
          subscription_status = ${status},
          current_period_end = ${currentPeriodEnd ? currentPeriodEnd.toISOString() : null},
          updated_at = now()
      where id = ${org.id}
    `);
  } else {
    await dbInternal.execute(sql`
      update public.organizations
      set stripe_customer_id = ${customerId},
          stripe_subscription_id = ${sub.id},
          subscription_status = ${status},
          current_period_end = ${currentPeriodEnd ? currentPeriodEnd.toISOString() : null},
          updated_at = now()
      where id = ${org.id}
    `);
  }

  if (mapping) {
    await mirrorSubscriptionAudit({
      orgId: org.id,
      customerId,
      subscriptionId: sub.id,
      plan: mapping.plan,
      cycle: mapping.cycle,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    });
  }

  await audit(org.id, {
    actor: "webhook",
    action: "subscription.updated",
    targetType: "organization",
    targetId: org.id,
    metadata: {
      status,
      plan: mapping?.plan ?? null,
      cycle: mapping?.cycle ?? null,
      subscription_id: sub.id,
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const metadataOrgId = sub.metadata?.organization_id as string | undefined;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const org = await resolveOrg({
    metadataOrgId,
    stripeCustomerId: customerId,
    eventId: sub.id,
  });
  if (!org) return;

  await dbInternal.execute(sql`
    update public.organizations
    set plan = 'free',
        subscription_status = 'canceled',
        stripe_subscription_id = null,
        current_period_end = null,
        updated_at = now()
    where id = ${org.id}
  `);

  await dbInternal.execute(sql`
    update public.subscriptions
    set status = 'canceled', cancel_at_period_end = false, updated_at = now()
    where stripe_subscription_id = ${sub.id}
  `);

  await audit(org.id, {
    actor: "webhook",
    action: "subscription.canceled",
    targetType: "organization",
    targetId: org.id,
    metadata: { subscription_id: sub.id },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const org = await resolveOrg({
    metadataOrgId: undefined,
    stripeCustomerId: customerId,
    eventId: invoice.id ?? "invoice:unknown",
  });
  if (!org) return;

  if (TERMINAL_STATUSES.has(org.subscription_status)) return;

  await dbInternal.execute(sql`
    update public.organizations
    set subscription_status = 'past_due', updated_at = now()
    where id = ${org.id}
      and subscription_status not in ('canceled', 'incomplete_expired')
  `);

  await audit(org.id, {
    actor: "webhook",
    action: "subscription.payment_failed",
    targetType: "organization",
    targetId: org.id,
    metadata: { invoice_id: invoice.id ?? null },
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const org = await resolveOrg({
    metadataOrgId: undefined,
    stripeCustomerId: customerId,
    eventId: invoice.id ?? "invoice:unknown",
  });
  if (!org) return;

  /* Only restore to active when we were past_due. trialing and canceled
     must not be clobbered — Stripe sends invoice.payment_succeeded for
     trial-ending invoices too. */
  if (org.subscription_status !== "past_due") return;

  await dbInternal.execute(sql`
    update public.organizations
    set subscription_status = 'active', updated_at = now()
    where id = ${org.id} and subscription_status = 'past_due'
  `);

  await audit(org.id, {
    actor: "webhook",
    action: "subscription.payment_recovered",
    targetType: "organization",
    targetId: org.id,
    metadata: { invoice_id: invoice.id ?? null },
  });
}
