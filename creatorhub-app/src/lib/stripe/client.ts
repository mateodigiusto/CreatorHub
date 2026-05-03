/**
 * Stripe SDK singleton + price-ID lookup.
 *
 * Read STRIPE_SECRET_KEY at module load time. When unset (current default —
 * no Stripe account configured yet), `getStripe()` throws and the caller is
 * expected to gracefully fall back to the UI-only mock.
 *
 * Imported only by /api/stripe/* and /api/webhooks/stripe — never from app
 * code (the ESLint `no-third-party-in-with-audit` rule blocks it from
 * `withAudit` callbacks).
 */

import Stripe from "stripe";

let _stripe: Stripe | null | undefined;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (_stripe !== undefined) {
    if (_stripe === null) throw new Error("stripe_not_configured");
    return _stripe;
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    _stripe = null;
    throw new Error("stripe_not_configured");
  }
  _stripe = new Stripe(key, {
    /* Pin to the SDK's bundled API version so library updates don't shift behavior. */
    apiVersion: "2026-04-22.dahlia",
    appInfo: { name: "CreatorHub", version: "0.1.0" },
  });
  return _stripe;
}

/* Price-ID lookup. The 4 env vars must be set together — half-set state is
   handled at the call site (return 503 with `stripe_not_configured`). */
type PlanCycle = `${"standard" | "pro"}_${"monthly" | "annual"}`;

export function priceIdFor(plan: "standard" | "pro", cycle: "monthly" | "annual"): string {
  const key = `${plan}_${cycle}` as PlanCycle;
  const map: Record<PlanCycle, string | undefined> = {
    standard_monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY,
    standard_annual: process.env.STRIPE_PRICE_STANDARD_ANNUAL,
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  };
  const id = map[key];
  if (!id) {
    throw new Error(`stripe_price_missing:${key}`);
  }
  return id;
}

/* Map a Stripe price ID back to plan+cycle for webhook handling.
   Falls back to ('standard', 'monthly') if the price isn't recognized — we
   shouldn't see foreign price IDs in our subscription webhook, but log and
   keep going rather than throwing inside an event handler. */
export function planCycleFromPriceId(
  priceId: string | null | undefined,
): { plan: "standard" | "pro"; cycle: "monthly" | "annual" } {
  switch (priceId) {
    case process.env.STRIPE_PRICE_PRO_ANNUAL:
      return { plan: "pro", cycle: "annual" };
    case process.env.STRIPE_PRICE_PRO_MONTHLY:
      return { plan: "pro", cycle: "monthly" };
    case process.env.STRIPE_PRICE_STANDARD_ANNUAL:
      return { plan: "standard", cycle: "annual" };
    case process.env.STRIPE_PRICE_STANDARD_MONTHLY:
    default:
      return { plan: "standard", cycle: "monthly" };
  }
}

export function appUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  /* Fall back to request origin — works for previews + dev. */
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
