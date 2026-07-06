/**
 * POST /api/stripe/portal-session
 *
 * Creates a Stripe Customer Portal session for the authed user. Used by
 * the Settings "Manage subscription" button. Returns the portal URL; the
 * caller redirects the browser there.
 *
 * 503 when Stripe is not configured. 404 when the user has never started
 * a checkout (no `stripe_customer_id` on their profile).
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { getStripe, isStripeConfigured, appUrl } from "@/lib/stripe/client";

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

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", userRes.user.id)
    .returns<Array<{ stripe_customer_id: string | null }>>()
    .maybeSingle();
  const customerId = profileRow?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "no_customer" }, { status: 404 });
  }

  const stripe = getStripe();
  const origin = appUrl(req);

  let session;
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    });
  } catch (err) {
    log.error("stripe.portal.create_failed", err as Error);
    return NextResponse.json({ error: "portal_failed" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
