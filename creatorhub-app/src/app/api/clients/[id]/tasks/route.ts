/**
 * GET  /api/clients/[id]/tasks   — list tasks for this relationship
 * POST /api/clients/[id]/tasks   — create a task (manager only)
 *
 * RLS handles membership/active-status checks. The route adds a
 * `completedToday` flag for daily tasks so the UI doesn't have to make a
 * second round-trip to the completion log.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { notify } from "@/lib/notifications";
import type { RelationshipTaskRow } from "@/lib/clients/types";

type DbTaskRow = {
  id: string;
  relationship_id: string;
  created_by: string;
  assigned_to: string;
  title: string;
  notes: string | null;
  creator_note: string | null;
  recurrence: "none" | "daily";
  deadline: string | null;
  status: "pending" | "in_progress" | "done";
  created_at: string;
  ended_at: string | null;
  completed_at: string | null;
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
  supabase: ReturnType<typeof getSupabaseServiceRole>,
  creatorId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", creatorId)
    .returns<Array<{ timezone: string }>>()
    .maybeSingle();
  return data?.timezone ?? "UTC";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: rel } = await supabase
    .from("creator_relationships")
    .select("creator_id")
    .eq("id", id)
    .returns<Array<{ creator_id: string | null }>>()
    .maybeSingle();
  if (!rel?.creator_id) {
    return NextResponse.json({ tasks: [] });
  }

  const { data: rows } = await supabase
    .from("relationship_tasks")
    .select(
      "id, relationship_id, created_by, assigned_to, title, notes, creator_note, recurrence, deadline, status, created_at, ended_at, completed_at",
    )
    .eq("relationship_id", id)
    .is("ended_at", null)
    .order("created_at", { ascending: false })
    .returns<DbTaskRow[]>();

  if (!rows || rows.length === 0) {
    return NextResponse.json({ tasks: [] });
  }

  /* For daily tasks, fetch today's completions to set the
     `completedToday` flag. Today is the creator's local day. */
  const dailyIds = rows.filter((r) => r.recurrence === "daily").map((r) => r.id);
  let completedTodayIds = new Set<string>();
  if (dailyIds.length > 0) {
    const admin = getSupabaseServiceRole();
    const tz = await getCreatorTz(admin, rel.creator_id);
    const today = ymdInTz(new Date(), tz);
    const { data: comps } = await supabase
      .from("relationship_task_completions")
      .select("task_id")
      .in("task_id", dailyIds)
      .eq("day", today)
      .returns<Array<{ task_id: string }>>();
    completedTodayIds = new Set((comps ?? []).map((c) => c.task_id));
  }

  const tasks: RelationshipTaskRow[] = rows.map((r) => ({
    id: r.id,
    relationshipId: r.relationship_id,
    createdBy: r.created_by,
    assignedTo: r.assigned_to,
    title: r.title,
    notes: r.notes,
    creatorNote: r.creator_note,
    recurrence: r.recurrence,
    deadline: r.deadline,
    status: r.status,
    createdAt: r.created_at,
    endedAt: r.ended_at,
    completedAt: r.completed_at,
    ...(r.recurrence === "daily" && {
      completedToday: completedTodayIds.has(r.id),
    }),
  }));

  return NextResponse.json({ tasks });
}

type PostBody = {
  title?: string;
  notes?: string;
  recurrence?: "none" | "daily";
  deadline?: string | null;
  assignedTo?: "creator" | "self";
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "title_required" }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ error: "title_too_long" }, { status: 400 });
  }
  const recurrence = body.recurrence === "daily" ? "daily" : "none";
  const notes = (body.notes ?? "").slice(0, 5000) || null;
  const deadline = recurrence === "none" ? body.deadline ?? null : null;

  /* Resolve manager + creator from the relationship. RLS already filtered
     to ones the user can see. Manager = creator_relationships.manager_id. */
  const { data: rel } = await supabase
    .from("creator_relationships")
    .select("manager_id, creator_id, status")
    .eq("id", id)
    .returns<Array<{
      manager_id: string;
      creator_id: string | null;
      status: string;
    }>>()
    .maybeSingle();
  if (!rel) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (rel.status !== "active") {
    return NextResponse.json({ error: "relationship_not_active" }, { status: 400 });
  }
  if (rel.manager_id !== userRes.user.id) {
    return NextResponse.json({ error: "manager_only" }, { status: 403 });
  }
  if (!rel.creator_id) {
    return NextResponse.json({ error: "no_creator_yet" }, { status: 400 });
  }

  const assignedTo =
    body.assignedTo === "self" ? rel.manager_id : rel.creator_id;

  const { data, error } = await supabase
    .from("relationship_tasks")
    .insert({
      relationship_id: id,
      created_by: rel.manager_id,
      assigned_to: assignedTo,
      title,
      notes,
      recurrence,
      deadline,
    } as never)
    .select(
      "id, relationship_id, created_by, assigned_to, title, notes, creator_note, recurrence, deadline, status, created_at, ended_at, completed_at",
    )
    .returns<DbTaskRow[]>()
    .single();
  if (error || !data) {
    log.error("clients.task_insert_failed", error ?? new Error("no row"));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  /* Notify the assignee (typically the creator). */
  if (assignedTo !== userRes.user.id) {
    await notify({
      recipientId: assignedTo,
      kind: "task_assigned",
      body: `New task: ${title.slice(0, 60)}`,
      targetType: "task",
      targetId: data.id,
    });
  }

  const task: RelationshipTaskRow = {
    id: data.id,
    relationshipId: data.relationship_id,
    createdBy: data.created_by,
    assignedTo: data.assigned_to,
    title: data.title,
    notes: data.notes,
    creatorNote: data.creator_note,
    recurrence: data.recurrence,
    deadline: data.deadline,
    status: data.status,
    createdAt: data.created_at,
    endedAt: data.ended_at,
    completedAt: data.completed_at,
    ...(data.recurrence === "daily" && { completedToday: false }),
  };

  return NextResponse.json({ task });
}
