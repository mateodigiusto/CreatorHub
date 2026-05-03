/**
 * POST /api/stripe/checkout-session
 *
 * Creates a Stripe Checkout session for the authed user, with a 7-day free
 * trial baked into `subscription_data.trial_period_days`. On success, Stripe
 * redirects the browser to the hosted checkout; the webhook handler at
 * /api/webhooks/stripe writes the resulting subscription row.
 *
 * When STRIPE_SECRET_KEY is unset, we 503 — the onboarding step 8 caller
 * detects this and falls back to the UI-only mock (writes profile.trial,
 * routes to /dashboard).
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import {
  getStripe,
  isStripeConfigured,
  priceIdFor,
  appUrl,
} from "@/lib/stripe/client";

type Body = {
  plan: "standard" | "pro";
  cycle: "monthly" | "annual";
};

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 },
    );
  }

  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;
  const email = userRes.user.email ?? undefined;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (
    (body.plan !== "standard" && body.plan !== "pro") ||
    (body.cycle !== "monthly" && body.cycle !== "annual")
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  let priceId: string;
  try {
    priceId = priceIdFor(body.plan, body.cycle);
  } catch (err) {
    log.error("stripe.checkout.price_missing", err as Error, {
      plan: body.plan,
      cycle: body.cycle,
    });
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  /* Reuse an existing Stripe customer if we've created one for this user
     before. RLS lets the user read their own profile row. */
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .returns<Array<{ stripe_customer_id: string | null }>>()
    .maybeSingle();
  const existingCustomer = profileRow?.stripe_customer_id ?? null;

  const stripe = getStripe();
  const origin = appUrl(req);

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(existingCustomer
        ? { customer: existingCustomer }
        : { customer_email: email }),
      client_reference_id: userId,
      metadata: { user_id: userId, plan: body.plan, cycle: body.cycle },
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: userId, plan: body.plan, cycle: body.cycle },
      },
      allow_promotion_codes: true,
      success_url: `${origin}/onboarding?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/onboarding?stripe=cancel`,
    });
  } catch (err) {
    log.error("stripe.checkout.create_failed", err as Error);
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
