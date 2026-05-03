import type { getSupabaseServer } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof getSupabaseServer>>;

const STANDARD_MONTHLY_LIMIT = 15;

export type BudgetCheck =
  | { ok: true; remaining: number; limit: number | null; plan: "standard" | "pro" }
  | {
      ok: false;
      reason: "monthly_limit_reached";
      limit: number;
      used: number;
    };

/**
 * Pro subscribers (active or trialing) → unlimited.
 * Everyone else → 15 analyses per calendar month.
 *
 * Counts run against `content_analyses` for this user since the start of
 * the current UTC month. RLS auto-scopes both queries to the calling user.
 */
export async function checkAnalysisBudget(
  supabase: Client,
  userId: string,
): Promise<BudgetCheck> {
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<Array<{ plan: string; status: string }>>();

  if (subs && subs[0]?.plan === "pro") {
    return { ok: true, remaining: -1, limit: null, plan: "pro" };
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("content_analyses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart.toISOString());

  const usedCount = count ?? 0;
  if (usedCount >= STANDARD_MONTHLY_LIMIT) {
    return {
      ok: false,
      reason: "monthly_limit_reached",
      limit: STANDARD_MONTHLY_LIMIT,
      used: usedCount,
    };
  }
  return {
    ok: true,
    remaining: STANDARD_MONTHLY_LIMIT - usedCount,
    limit: STANDARD_MONTHLY_LIMIT,
    plan: "standard",
  };
}

export const ANALYSIS_LIMIT = STANDARD_MONTHLY_LIMIT;
