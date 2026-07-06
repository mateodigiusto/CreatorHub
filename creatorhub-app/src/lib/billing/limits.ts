/**
 * Plan-limit enforcement.
 *
 * `assertPlanAllows(...)` is the gate route handlers call before performing
 * a plan-gated mutation (add client, run AI analyzer, upload video). Throws
 * a PlanLimitError that callers convert to a 402-style response.
 *
 * Reads counts via the request-bound Supabase server client — RLS already
 * isolates rows to the caller's org.
 */

import type { Plan } from "@/lib/agency/_phase1_deps";
import { PLANS, nextPlanUp } from "./plans";
import { getSupabaseServer } from "@/lib/supabase/server";
import { recordPlanLimitBreadcrumb } from "@/lib/agency/plan-limit-breadcrumb";

export type PlanCapability =
  | { kind: "add_client"; organizationId: string }
  | { kind: "ai_analyzer" }
  | { kind: "video_upload" };

export class PlanLimitError extends Error {
  readonly code = "plan_limit";
  readonly capability: PlanCapability["kind"];
  readonly currentPlan: Plan;
  readonly upgradeTo: Plan | null;
  constructor(
    capability: PlanCapability["kind"],
    currentPlan: Plan,
    message: string,
  ) {
    super(message);
    this.capability = capability;
    this.currentPlan = currentPlan;
    this.upgradeTo = nextPlanUp(currentPlan);
  }
}

export async function assertPlanAllows(
  plan: Plan,
  capability: PlanCapability,
): Promise<void> {
  const def = PLANS[plan];

  switch (capability.kind) {
    case "add_client": {
      const used = await countActiveClients(capability.organizationId);
      if (used >= def.maxClients) {
        recordPlanLimitBreadcrumb({
          capability: "add_client",
          plan,
          organizationId: capability.organizationId,
        });
        throw new PlanLimitError(
          "add_client",
          plan,
          `Plan "${def.label}" allows ${def.maxClients} client${def.maxClients === 1 ? "" : "s"}. Upgrade to add more.`,
        );
      }
      return;
    }
    case "ai_analyzer": {
      if (!def.features.ai) {
        recordPlanLimitBreadcrumb({ capability: "ai_analyzer", plan });
        throw new PlanLimitError(
          "ai_analyzer",
          plan,
          `AI features require the Starter plan or above.`,
        );
      }
      return;
    }
    case "video_upload": {
      if (!def.features.video) {
        recordPlanLimitBreadcrumb({ capability: "video_upload", plan });
        throw new PlanLimitError(
          "video_upload",
          plan,
          `Video uploads require the Starter plan or above.`,
        );
      }
      return;
    }
  }
}

/**
 * Count clients that count against the plan limit. Archived clients don't
 * count — they're inert, slot-free.
 */
export async function countActiveClients(organizationId: string): Promise<number> {
  const supabase = await getSupabaseServer();
  const { count, error } = await supabase
    .from("clients")
    .select("id", { head: true, count: "exact" })
    .eq("organization_id", organizationId)
    .neq("status", "archived");
  if (error) throw error;
  return count ?? 0;
}

/** Returns { used, max } for display in the upgrade tooltip / billing tab. */
export async function clientQuota(
  plan: Plan,
  organizationId: string,
): Promise<{ used: number; max: number; remaining: number; atLimit: boolean }> {
  const def = PLANS[plan];
  const used = await countActiveClients(organizationId);
  const max = def.maxClients;
  const remaining = Math.max(0, max - used);
  return {
    used,
    max,
    remaining,
    atLimit: used >= max,
  };
}
