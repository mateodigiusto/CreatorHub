/**
 * Plan definitions for the agency tier ladder.
 *
 * Limits enforced via assertPlanAllows in src/lib/billing/limits.ts. The
 * Stripe Price IDs that map to these plans are configured at Phase 6 — see
 * docs/runbooks/stripe-activation.md.
 *
 * The trial path is plan='pro' + subscription_status='trialing' for 14 days
 * (set on org creation in Phase 1). A daily cron downgrades expired trials
 * to free, also in Phase 6.
 */

import type { Plan } from "@/lib/agency/_phase1_deps";

export type PlanFeatures = {
  ai: boolean;
  video: boolean;
  customDomain: boolean;
};

export type PlanDefinition = {
  id: Plan;
  label: string;
  maxClients: number;
  maxMonthlyViews: number;
  features: PlanFeatures;
};

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    maxClients: 1,
    maxMonthlyViews: 10_000,
    features: { ai: false, video: false, customDomain: false },
  },
  starter: {
    id: "starter",
    label: "Starter",
    maxClients: 5,
    maxMonthlyViews: 100_000,
    features: { ai: true, video: true, customDomain: false },
  },
  pro: {
    id: "pro",
    label: "Pro",
    maxClients: 20,
    maxMonthlyViews: 1_000_000,
    features: { ai: true, video: true, customDomain: true },
  },
  scale: {
    id: "scale",
    label: "Scale",
    maxClients: Number.POSITIVE_INFINITY,
    maxMonthlyViews: Number.POSITIVE_INFINITY,
    features: { ai: true, video: true, customDomain: true },
  },
};

export function planFor(plan: Plan): PlanDefinition {
  return PLANS[plan];
}

/** Next paid tier up from the current one (Free → Starter, Starter → Pro, …). */
export function nextPlanUp(plan: Plan): Plan | null {
  switch (plan) {
    case "free":
      return "starter";
    case "starter":
      return "pro";
    case "pro":
      return "scale";
    case "scale":
      return null;
  }
}
