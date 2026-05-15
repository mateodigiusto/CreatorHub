/**
 * Phase 6 plan-limit → HTTP 402 mapper.
 *
 * Route handlers that wrap a call to `assertPlanAllows(...)` (owned by
 * Phase 2 at `./limits`) should let this helper translate the resulting
 * `PlanLimitError` into the canonical 402 JSON shape we serve to the
 * browser. Any other thrown error should propagate.
 *
 * Phase 2 owns ./limits.ts in the real cutover. During Phase 6 build that
 * file may not exist yet, so this module defines a local `PlanLimitError`
 * with the same nominal shape (code === 'plan_limit', capability,
 * currentPlan, upgradeTo, message). Phase 2's class is type-compatible.
 */

import { NextResponse } from "next/server";

import type { PaidPlan } from "@/lib/stripe/org-plan-map";

export type PlanLimitCapability =
  | "add_client"
  | "ai_analyzer"
  | "video_upload"
  | "monthly_views"
  | "custom_domain";

export type PlanTier = "free" | PaidPlan;

export class PlanLimitError extends Error {
  readonly code = "plan_limit" as const;
  readonly capability: PlanLimitCapability;
  readonly currentPlan: PlanTier;
  readonly upgradeTo: PaidPlan | null;

  constructor(args: {
    capability: PlanLimitCapability;
    currentPlan: PlanTier;
    upgradeTo: PaidPlan | null;
    message: string;
  }) {
    super(args.message);
    this.name = "PlanLimitError";
    this.capability = args.capability;
    this.currentPlan = args.currentPlan;
    this.upgradeTo = args.upgradeTo;
  }
}

function isPlanLimitError(err: unknown): err is PlanLimitError {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "plan_limit" &&
    typeof (err as { capability?: unknown }).capability === "string"
  );
}

export function planLimitResponse(err: unknown): NextResponse | null {
  if (!isPlanLimitError(err)) return null;
  return NextResponse.json(
    {
      error: "plan_limit",
      message: err.message,
      capability: err.capability,
      current_plan: err.currentPlan,
      upgrade_to: err.upgradeTo,
    },
    { status: 402 },
  );
}
