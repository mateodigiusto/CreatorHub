/**
 * GET /api/admin/usage?period=30d|7d|24h
 *
 * Cost-tracking dashboard for AI consumption. Reads audit_log for the
 * actions that map to paid AI calls and rolls them up:
 *
 *   - script.generated      — Anthropic Claude completion (~$0.015 / script)
 *   - content_dna.analyzed  — Apify scrape + Whisper + Claude (~$0.20 / video)
 *   - outreach.generated    — Anthropic Claude completion (~$0.015 / draft)
 *
 * The cost-per-action rates are display estimates only — actual
 * Anthropic / OpenAI / Apify billing is the source of truth. The point of
 * this dashboard is to flag a runaway user before the monthly bill arrives.
 *
 * Returns:
 *   - totals (count + estimated $ for the window)
 *   - per-day timeseries (sparkline source)
 *   - top users by total estimated cost
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { requireAdmin } from "@/lib/admin/auth";

/* Display-only estimates. Update when provider pricing changes. */
const COST_PER_ACTION: Record<string, number> = {
  "script.generated": 0.015,
  "content_dna.analyzed": 0.20,
  "outreach.generated": 0.015,
};

const TRACKED_ACTIONS = Object.keys(COST_PER_ACTION);

type AuditRow = {
  user_id: string;
  action: string;
  at: string;
};

type CounterpartyRow = {
  id: string;
  email: string;
  display_name: string | null;
};

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }

  const period = req.nextUrl.searchParams.get("period") ?? "30d";
  const windowStart = new Date();
  if (period === "24h") windowStart.setUTCHours(windowStart.getUTCHours() - 24);
  else if (period === "7d") windowStart.setUTCDate(windowStart.getUTCDate() - 7);
  else windowStart.setUTCDate(windowStart.getUTCDate() - 30);
  const windowStartIso = windowStart.toISOString();

  const admin = getSupabaseServiceRole();
  const { data: auditData, error } = await admin
    .from("audit_log")
    .select("user_id, action, at")
    .in("action", TRACKED_ACTIONS)
    .gte("at", windowStartIso)
    .order("at", { ascending: false })
    .limit(50_000)
    .returns<AuditRow[]>();

  if (error) {
    log.error("admin.usage.load_failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  const rows = auditData ?? [];

  /* Roll up per-user. */
  type UserRollup = {
    userId: string;
    counts: Record<string, number>;
    totalCost: number;
  };
  const byUser = new Map<string, UserRollup>();
  /* Per-action totals across all users. */
  const totals: Record<string, number> = Object.fromEntries(
    TRACKED_ACTIONS.map((a) => [a, 0]),
  );
  /* Per-day buckets across all users (for sparkline). */
  const days = new Map<string, number>();

  for (const r of rows) {
    totals[r.action] = (totals[r.action] ?? 0) + 1;
    const day = r.at.slice(0, 10);
    days.set(day, (days.get(day) ?? 0) + (COST_PER_ACTION[r.action] ?? 0));

    let u = byUser.get(r.user_id);
    if (!u) {
      u = { userId: r.user_id, counts: {}, totalCost: 0 };
      byUser.set(r.user_id, u);
    }
    u.counts[r.action] = (u.counts[r.action] ?? 0) + 1;
    u.totalCost += COST_PER_ACTION[r.action] ?? 0;
  }

  /* Top 25 users by total estimated cost — that's the actionable list. */
  const topUserRollups = Array.from(byUser.values())
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 25);

  /* Resolve user emails / display names for the top list. */
  const topUserIds = topUserRollups.map((u) => u.userId);
  let nameByUser = new Map<string, { email: string; displayName: string | null }>();
  if (topUserIds.length > 0) {
    const { data: cps } = await admin
      .from("users")
      .select("id, email, display_name")
      .in("id", topUserIds)
      .returns<CounterpartyRow[]>();
    for (const c of cps ?? []) {
      nameByUser.set(c.id, {
        email: c.email,
        displayName: c.display_name,
      });
    }
  } else {
    nameByUser = new Map();
  }

  const totalCount = TRACKED_ACTIONS.reduce((acc, a) => acc + (totals[a] ?? 0), 0);
  const totalCost = TRACKED_ACTIONS.reduce(
    (acc, a) => acc + (totals[a] ?? 0) * (COST_PER_ACTION[a] ?? 0),
    0,
  );

  return NextResponse.json({
    period,
    windowStart: windowStartIso,
    windowEnd: new Date().toISOString(),
    totals: {
      count: totalCount,
      estimatedCost: round(totalCost),
      byAction: TRACKED_ACTIONS.map((a) => ({
        action: a,
        count: totals[a] ?? 0,
        estimatedCost: round((totals[a] ?? 0) * (COST_PER_ACTION[a] ?? 0)),
      })),
    },
    timeseries: Array.from(days.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, cost]) => ({ day, cost: round(cost) })),
    topUsers: topUserRollups.map((u) => {
      const meta = nameByUser.get(u.userId);
      return {
        userId: u.userId,
        email: meta?.email ?? "(deleted)",
        displayName: meta?.displayName ?? null,
        counts: u.counts,
        estimatedCost: round(u.totalCost),
      };
    }),
    rates: COST_PER_ACTION,
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
