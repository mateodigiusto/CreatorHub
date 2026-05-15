/**
 * POST /api/stripe/checkout — Phase 6 org-level Checkout (STAGED).
 *
 * Replaces the legacy user-level /api/stripe/checkout-session for the
 * org-scoped billing flow. The legacy handler stays in tree until the
 * onboarding paywall step is migrated (see Phase 6 NOTES for the
 * decision).
 *
 * Requires `requireOrgAdmin()` — only admins can change the plan. Body
 * shape: { plan: 'starter'|'pro'|'scale', cycle: 'monthly'|'annual' }.
 *
 * Reuses `organizations.stripe_customer_id` when present so Stripe ends
 * up with a single customer record per org regardless of which admin
 * initiates the checkout.
 */

import { NextResponse, type NextRequest } from "next/server";

import { requireOrgAdmin } from "@/lib/agency/_phase1_deps";
import { log } from "@/lib/log";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  appUrl,
  getStripe,
  isStripeConfigured,
} from "@/lib/stripe/client";
import {
  CYCLES,
  PAID_PLANS,
  orgPriceIdFor,
  type Cycle,
  type PaidPlan,
} from "@/lib/stripe/org-plan-map";

type Body = { plan: PaidPlan; cycle: Cycle };

const PAID_SET: ReadonlySet<string> = new Set(PAID_PLANS);
const CYCLE_SET: ReadonlySet<string> = new Set(CYCLES);

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const session = await requireOrgAdmin();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!PAID_SET.has(body.plan) || !CYCLE_SET.has(body.cycle)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  let priceId: string;
  try {
    priceId = orgPriceIdFor(body.plan, body.cycle);
  } catch (err) {
    log.error("stripe.org_checkout.price_missing", err as Error, {
      plan: body.plan,
      cycle: body.cycle,
    });
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const supabase = await getSupabaseServer();
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", session.organization.id)
    .returns<Array<{ stripe_customer_id: string | null }>>()
    .maybeSingle();
  const existingCustomer = orgRow?.stripe_customer_id ?? null;

  const stripe = getStripe();
  const origin = appUrl(req);

  let checkout;
  try {
    checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(existingCustomer
        ? { customer: existingCustomer }
        : { customer_email: session.email }),
      client_reference_id: session.organization.id,
      metadata: {
        organization_id: session.organization.id,
        plan: body.plan,
        cycle: body.cycle,
      },
      subscription_data: {
        metadata: {
          organization_id: session.organization.id,
          plan: body.plan,
          cycle: body.cycle,
        },
      },
      allow_promotion_codes: true,
      success_url: `${origin}/settings/billing?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings/billing?stripe=cancel`,
    });
  } catch (err) {
    log.error("stripe.org_checkout.create_failed", err as Error, {
      organization_id: session.organization.id,
    });
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }

  return NextResponse.json({ url: checkout.url, sessionId: checkout.id });
}
