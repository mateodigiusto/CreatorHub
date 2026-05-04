/**
 * PATCH  /api/clients/[id]/tasks/[taskId]
 *   - For one-off tasks: update title/notes/status/creatorNote/deadline.
 *   - For daily tasks: same fields, plus `completedToday: true|false` →
 *     INSERT/DELETE in `relationship_task_completions` for today.
 *
 * DELETE /api/clients/[id]/tasks/[taskId]
 *   - One-off: hard delete (cascades completion rows).
 *   - Daily: soft-delete via `ended_at = now()` so historical completions
 *     stay readable in the streak heatmap.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type Body = {
  title?: string;
  notes?: string;
  creatorNote?: string;
  deadline?: string | null;
  status?: "pending" | "in_progress" | "done";
  completedToday?: boolean;
};

type TaskRow = {
  id: string;
  relationship_id: string;
  recurrence: "none" | "daily";
  status: "pending" | "in_progress" | "done";
  assigned_to: string;
};

function ymdInTz(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

async function getCreatorTz(
  admin: ReturnType<typeof getSupabaseServiceRole>,
  creatorId: string,
): Promise<string> {
  const { data } = await admin
    .from("profiles")
    .select("timezone")
    .eq("user_id", creatorId)
    .returns<Array<{ timezone: string }>>()
    .maybeSingle();
  return data?.timezone ?? "UTC";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { data: task } = await supabase
    .from("relationship_tasks")
    .select("id, relationship_id, recurrence, status, assigned_to")
    .eq("id", taskId)
    .eq("relationship_id", id)
    .returns<TaskRow[]>()
    .maybeSingle();
  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  /* Daily-task completion toggle goes through the completion log. */
  if (body.completedToday !== undefined && task.recurrence === "daily") {
    const admin = getSupabaseServiceRole();
    const { data: rel } = await admin
      .from("creator_relationships")
      .select("creator_id")
      .eq("id", id)
      .returns<Array<{ creator_id: string | null }>>()
      .maybeSingle();
    if (!rel?.creator_id) {
      return NextResponse.json({ error: "no_creator_yet" }, { status: 400 });
    }
    const tz = await getCreatorTz(admin, rel.creator_id);
    const day = ymdInTz(new Date(), tz);

    if (body.completedToday) {
      const { error } = await supabase
        .from("relationship_task_completions")
        .insert({ task_id: taskId, day } as never);
      if (error && !error.message.includes("duplicate")) {
        log.error("clients.completion_insert_failed", error);
        return NextResponse.json({ error: "insert_failed" }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from("relationship_task_completions")
        .delete()
        .eq("task_id", taskId)
        .eq("day", day);
      if (error) {
        log.error("clients.completion_delete_failed", error);
        return NextResponse.json({ error: "delete_failed" }, { status: 500 });
      }
    }
  }

  /* Direct field updates. */
  const patch: Record<string, string | null> = {};
  if (body.title !== undefined) {
    const t = body.title.trim();
    if (t.length === 0)
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    if (t.length > 200)
      return NextResponse.json({ error: "title_too_long" }, { status: 400 });
    patch.title = t;
  }
  if (body.notes !== undefined) {
    patch.notes = body.notes.slice(0, 5000) || null;
  }
  if (body.creatorNote !== undefined) {
    patch.creator_note = body.creatorNote.slice(0, 2000) || null;
  }
  if (body.deadline !== undefined && task.recurrence === "none") {
    patch.deadline = body.deadline;
  }
  if (body.status !== undefined && task.recurrence === "none") {
    if (!["pending", "in_progress", "done"].includes(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    patch.status = body.status;
    patch.completed_at = body.status === "done" ? new Date().toISOString() : null;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("relationship_tasks")
      .update(patch as never)
      .eq("id", taskId);
    if (error) {
      log.error("clients.task_update_failed", error);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: task } = await supabase
    .from("relationship_tasks")
    .select("id, recurrence")
    .eq("id", taskId)
    .eq("relationship_id", id)
    .returns<Array<{ id: string; recurrence: "none" | "daily" }>>()
    .maybeSingle();
  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (task.recurrence === "daily") {
    /* Soft-delete: keep historical completions readable for the heatmap. */
    const { error } = await supabase
      .from("relationship_tasks")
      .update({ ended_at: new Date().toISOString() } as never)
      .eq("id", taskId);
    if (error) {
      log.error("clients.task_soft_delete_failed", error);
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("relationship_tasks")
      .delete()
      .eq("id", taskId);
    if (error) {
      log.error("clients.task_hard_delete_failed", error);
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
