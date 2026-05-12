/**
 * POST /api/stripe/portal — Phase 6 org-level Customer Portal (STAGED).
 *
 * Replaces the legacy user-level /api/stripe/portal-session for the
 * org-scoped flow. Requires `requireOrgAdmin()`. Returns `{ url }`; the
 * caller redirects the browser there.
 *
 *   - 503 when STRIPE_SECRET_KEY is unset.
 *   - 404 with { error: 'no_customer' } when the org has never started a
 *     checkout (no stripe_customer_id on the row yet).
 */

import { NextResponse, type NextRequest } from "next/server";

import { requireOrgAdmin } from "@/lib/agency/_phase1_deps";
import { log } from "@/lib/log";
import { getSupabaseServer } from "@/lib/supabase/server";
import { appUrl, getStripe, isStripeConfigured } from "@/lib/stripe/client";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const session = await requireOrgAdmin();

  const supabase = await getSupabaseServer();
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", session.organization.id)
    .returns<Array<{ stripe_customer_id: string | null }>>()
    .maybeSingle();
  const customerId = orgRow?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "no_customer" }, { status: 404 });
  }

  const stripe = getStripe();
  const origin = appUrl(req);

  let portal;
  try {
    portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings/billing`,
    });
  } catch (err) {
    log.error("stripe.org_portal.create_failed", err as Error, {
      organization_id: session.organization.id,
    });
    return NextResponse.json({ error: "portal_failed" }, { status: 500 });
  }

  return NextResponse.json({ url: portal.url });
}
