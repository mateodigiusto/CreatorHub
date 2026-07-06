/**
 * Org-level Stripe Price ↔ Plan/Cycle mapping for Phase 6.
 *
 * The legacy `priceIdFor` / `planCycleFromPriceId` in ./client.ts maps the
 * old `standard | pro` user-level prices. Phase 6 introduces a four-tier
 * org-level plan set (`free | starter | pro | scale` — `free` has no
 * Stripe price, the other three are paid). The user creates the six new
 * Price IDs in Stripe Dashboard (3 plans × 2 cycles); env vars are named
 * STRIPE_PRICE_${PLAN_UPPER}_${CYCLE_UPPER}.
 *
 * Kept in a separate file so the legacy mapper stays untouched while the
 * onboarding paywall (Phase 0 era) continues to work alongside the new
 * org-level flow.
 */

export type Cycle = "monthly" | "annual";
export type PaidPlan = "starter" | "pro" | "scale";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export const PAID_PLANS: readonly PaidPlan[] = ["starter", "pro", "scale"] as const;
export const CYCLES: readonly Cycle[] = ["monthly", "annual"] as const;

export function orgPriceIdFor(plan: PaidPlan, cycle: Cycle): string {
  const envKey = `STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}`;
  const id = process.env[envKey];
  if (!id) {
    throw new Error(`stripe_price_missing:${plan}_${cycle}`);
  }
  return id;
}

export function orgPlanCycleFromPriceId(
  priceId: string | null | undefined,
): { plan: PaidPlan; cycle: Cycle } | null {
  if (!priceId) return null;
  for (const plan of PAID_PLANS) {
    for (const cycle of CYCLES) {
      const envKey = `STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}`;
      if (process.env[envKey] === priceId) {
        return { plan, cycle };
      }
    }
  }
  return null;
}

const KNOWN_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

export function mapStripeSubscriptionStatus(s: string): SubscriptionStatus {
  return KNOWN_STATUSES.has(s as SubscriptionStatus)
    ? (s as SubscriptionStatus)
    : "incomplete";
}
