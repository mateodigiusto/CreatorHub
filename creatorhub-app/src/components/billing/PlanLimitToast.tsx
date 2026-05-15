"use client";

/**
 * Minimal client-side shim for surfacing plan-limit responses.
 *
 * Today this just `alert()`s — enough to expose the 402 body shape during
 * Phase 6 development. Phase 8 will swap this for the real `Toaster` from
 * `@/components/ui/Toaster` and wire it through the AppStateProvider's
 * `showToast` flow.
 */

import type { PaidPlan } from "@/lib/stripe/org-plan-map";

const PLAN_LABEL: Record<PaidPlan, string> = {
  starter: "Starter",
  pro: "Pro",
  scale: "Scale",
};

export type PlanLimitBody = {
  message: string;
  upgrade_to?: PaidPlan | null;
};

export function showPlanLimit(body: PlanLimitBody): void {
  const upgrade = body.upgrade_to ? `\nUpgrade to ${PLAN_LABEL[body.upgrade_to]}.` : "";
  if (typeof window !== "undefined") {
    window.alert(`${body.message}${upgrade}`);
  }
}
