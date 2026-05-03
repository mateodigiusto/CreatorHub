/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events. We listen to:
 *   - checkout.session.completed       → write subscription, link customer to user
 *   - customer.subscription.updated    → status / period_end / cancel_at_period_end
 *   - customer.subscription.deleted    → status='canceled'
 *
 * Idempotency: subscriptions.stripe_subscription_id is UNIQUE; we do an
 * upsert on every relevant event so duplicate deliveries no-op. Stripe's own
 * event id is logged for trace; v2 may add a stripe_events idempotency table.
 *
 * Per CLAUDE.md: webhook handlers run service-role + outside any DB
 * transaction (never inside withAudit). All audit_log writes happen via the
 * plain `audit()` helper between Stripe API calls and DB writes.
 */

import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { sql } from "drizzle-orm";
import { dbInternal } from "@/db";
import { subscriptions, profiles } from "@/db/schema";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";
import { getStripe, isStripeConfigured, planCycleFromPriceId } from "@/lib/stripe/client";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    /* No webhook signing secret + no SDK — drop these. */
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signingSecret) {
    log.error(
      "stripe.webhook.signing_secret_missing",
      new Error("STRIPE_WEBHOOK_SECRET unset"),
    );
    return NextResponse.json({ error: "webhook_misconfigured" }, { status: 500 });
  }

  /* Stripe requires the raw request body for signature verification —
     don't .json() it first. */
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

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.created":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        /* Ignore unrelated events — Stripe sends a lot. */
        break;
    }
  } catch (err) {
    log.error("stripe.webhook.handler_failed", err as Error, {
      event_id: event.id,
      event_type: event.type,
    });
    /* Return 500 so Stripe retries. Idempotency handles duplicates. */
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = (session.metadata?.user_id ?? session.client_reference_id) as string | undefined;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!userId || !customerId) {
    log.warn("stripe.webhook.checkout_missing_ids", {
      session_id: session.id,
      user_id: userId,
      customer_id: customerId,
    });
    return;
  }

  /* Persist the customer id on the user's profile so subsequent checkouts +
     portal sessions reuse it. */
  await dbInternal
    .update(profiles)
    .set({ stripeCustomerId: customerId, updatedAt: new Date() })
    .where(sql`${profiles.userId} = ${userId}`);

  if (subscriptionId) {
    /* Fetch the full subscription so we have the price + period info. */
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionUpsert(sub);
  }

  await audit(userId, {
    actor: "webhook",
    action: "subscription.checkout_completed",
    targetType: "subscription",
    targetId: subscriptionId ?? null,
    metadata: { customer_id: customerId, plan: session.metadata?.plan, cycle: session.metadata?.cycle },
  });
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.user_id;
  if (!userId) {
    log.warn("stripe.webhook.subscription_missing_user_id", { subscription_id: sub.id });
    return;
  }
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const { plan, cycle } = planCycleFromPriceId(priceId);
  const item = sub.items.data[0];
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  await dbInternal
    .insert(subscriptions)
    .values({
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      plan,
      cycle,
      status: sub.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        plan,
        cycle,
        status: sub.status,
        currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        updatedAt: new Date(),
      },
    });

  await audit(userId, {
    actor: "webhook",
    action: "subscription.updated",
    targetType: "subscription",
    targetId: sub.id,
    metadata: { status: sub.status, plan, cycle },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.user_id;
  if (!userId) {
    log.warn("stripe.webhook.deleted_missing_user_id", { subscription_id: sub.id });
    return;
  }

  await dbInternal
    .update(subscriptions)
    .set({
      status: "canceled",
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(sql`${subscriptions.stripeSubscriptionId} = ${sub.id}`);

  await audit(userId, {
    actor: "webhook",
    action: "subscription.canceled",
    targetType: "subscription",
    targetId: sub.id,
    metadata: {},
  });
}
