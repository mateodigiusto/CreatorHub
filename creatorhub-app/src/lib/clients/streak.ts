/**
 * Streak computation — derived from the `relationship_task_completions`
 * insert-only log. No counter to keep in sync; the same query gives us
 * "current streak" and a 30-day heatmap.
 *
 * Rule (per product spec): a day "counts" when ALL daily tasks alive on
 * that day have a completion row for that day. Days with no daily tasks
 * preserve the streak (no opportunity to fail) but don't extend it.
 *
 * Days use the creator's local timezone (`profiles.timezone`).
 *
 * This file is sanctioned to read DB via the Supabase server client
 * (RLS-scoped to the requesting user). It does not import dbInternal.
 */

import type { getSupabaseServer } from "@/lib/supabase/server";
import type { StreakResponse } from "./types";

type Client = Awaited<ReturnType<typeof getSupabaseServer>>;

type DayState = "complete" | "miss" | "no_tasks" | "in_progress";

type GridEntry = {
  day: string;
  state: DayState;
};

const WINDOW_DAYS = 30;

export async function computeStreak(
  supabase: Client,
  relationshipId: string,
  creatorTz: string,
): Promise<StreakResponse> {
  const todayStr = ymdInTz(new Date(), creatorTz);
  const startStr = addDays(todayStr, -(WINDOW_DAYS - 1));

  /* All daily tasks for this relationship, ever. We need the lifetime
     window of each (created_at, ended_at) to know which days it was
     "alive" — so we can't just filter by created_at >= startStr. */
  const { data: tasks } = await supabase
    .from("relationship_tasks")
    .select("id, created_at, ended_at")
    .eq("relationship_id", relationshipId)
    .eq("recurrence", "daily")
    .returns<Array<{ id: string; created_at: string; ended_at: string | null }>>();

  const taskList = tasks ?? [];
  const taskIds = taskList.map((t) => t.id);

  /* Completions in window. */
  let completionsByDay: Map<string, number> = new Map();
  if (taskIds.length > 0) {
    const { data: comps } = await supabase
      .from("relationship_task_completions")
      .select("day, task_id")
      .in("task_id", taskIds)
      .gte("day", startStr)
      .lte("day", todayStr)
      .returns<Array<{ day: string; task_id: string }>>();
    completionsByDay = new Map();
    for (const c of comps ?? []) {
      completionsByDay.set(c.day, (completionsByDay.get(c.day) ?? 0) + 1);
    }
  }

  /* Build the grid: oldest → newest. */
  const grid: GridEntry[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const day = addDays(startStr, i);
    const expected = taskList.filter((t) =>
      isTaskAliveOn(t.created_at, t.ended_at, day, creatorTz),
    ).length;
    const completed = completionsByDay.get(day) ?? 0;

    let state: DayState;
    if (expected === 0) state = "no_tasks";
    else if (completed >= expected)
      state = "complete";
    else if (day === todayStr) state = "in_progress";
    else state = "miss";

    grid.push({ day, state });
  }

  /* Current streak: walk backwards from today. complete → ++, no_tasks /
     in_progress → skip, miss → stop. */
  let current = 0;
  for (let i = grid.length - 1; i >= 0; i--) {
    const s = grid[i].state;
    if (s === "complete") current++;
    else if (s === "miss") break;
    /* no_tasks + in_progress: pass through */
  }

  /* Longest streak in window: same rules. */
  let longest = 0;
  let run = 0;
  for (const g of grid) {
    if (g.state === "complete") {
      run++;
      longest = Math.max(longest, run);
    } else if (g.state === "miss") {
      run = 0;
    }
    /* no_tasks + in_progress: pass through */
  }

  return { current, longest, grid };
}

/* ────────── helpers ────────── */

/**
 * "YYYY-MM-DD" in the given timezone. en-CA returns ISO ordering.
 */
function ymdInTz(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    /* Invalid tz string — fall back to UTC. */
    return date.toISOString().slice(0, 10);
  }
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

/**
 * Was the daily task alive on `day` (in the creator's tz)?
 * Alive = created on/before day AND not ended (or ended after day).
 */
function isTaskAliveOn(
  createdAtIso: string,
  endedAtIso: string | null,
  day: string,
  creatorTz: string,
): boolean {
  const createdDay = ymdInTz(new Date(createdAtIso), creatorTz);
  if (createdDay > day) return false;
  if (endedAtIso) {
    const endedDay = ymdInTz(new Date(endedAtIso), creatorTz);
    if (endedDay <= day) return false;
  }
  return true;
}
