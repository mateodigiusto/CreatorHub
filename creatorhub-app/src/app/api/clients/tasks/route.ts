/**
 * GET /api/clients/tasks
 *
 * Editor-facing cross-client Tasks union. Returns relationship_tasks
 * across every active relationship the editor manages, annotated with
 * the client's display name + the relationship_id for navigation.
 *
 * Defaults to the open tasks (pending + in_progress) so the editor sees
 * what's actually on their plate. Pass `?status=all|done|pending|in_progress`
 * to filter.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";

const VALID_STATUSES = new Set(["pending", "in_progress", "done"] as const);
type TaskStatus = "pending" | "in_progress" | "done";

type RelRow = {
  id: string;
  creator_id: string;
};

type CounterpartyRow = {
  id: string;
  email: string;
  display_name: string | null;
};

type TaskRow = {
  id: string;
  relationship_id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  recurrence: string;
  deadline: string | null;
  assigned_to: string;
  created_by: string;
  created_at: string;
  completed_at: string | null;
};

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const editorId = userRes.user.id;

  const statusFilter = req.nextUrl.searchParams.get("status") ?? "open";

  const { data: relsData } = await supabase
    .from("creator_relationships")
    .select("id, creator_id")
    .eq("manager_id", editorId)
    .eq("status", "active")
    .not("creator_id", "is", null);
  const rels = (relsData ?? []) as RelRow[];
  if (rels.length === 0) {
    return NextResponse.json({ tasks: [] });
  }

  const relIds = rels.map((r) => r.id);
  const clientIds = rels.map((r) => r.creator_id);
  const admin = getSupabaseServiceRole();

  let q = admin
    .from("relationship_tasks")
    .select(
      "id, relationship_id, title, notes, status, recurrence, deadline, assigned_to, created_by, created_at, completed_at",
    )
    .in("relationship_id", relIds);

  if (statusFilter === "open") {
    q = q.in("status", ["pending", "in_progress"]);
  } else if (statusFilter !== "all" && VALID_STATUSES.has(statusFilter as TaskStatus)) {
    q = q.eq("status", statusFilter as TaskStatus);
  }

  const [tasksRes, counterpartiesRes] = await Promise.all([
    q.order("deadline", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<TaskRow[]>(),
    admin
      .from("users")
      .select("id, email, display_name")
      .in("id", clientIds)
      .returns<CounterpartyRow[]>(),
  ]);

  if (tasksRes.error || counterpartiesRes.error) {
    log.error("clients.tasks.load_failed", {
      tasks: tasksRes.error,
      counterparties: counterpartiesRes.error,
    });
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  /* Build relationship → client name map. */
  const clientByRelId = new Map<string, { id: string; name: string }>();
  const nameByUser = new Map<string, string>();
  for (const c of counterpartiesRes.data ?? []) {
    nameByUser.set(c.id, c.display_name ?? c.email.split("@")[0] ?? "Client");
  }
  for (const r of rels) {
    clientByRelId.set(r.id, {
      id: r.creator_id,
      name: nameByUser.get(r.creator_id) ?? "Client",
    });
  }

  const enriched = (tasksRes.data ?? []).map((t) => {
    const client = clientByRelId.get(t.relationship_id);
    return {
      id: t.id,
      relationshipId: t.relationship_id,
      title: t.title,
      notes: t.notes,
      status: t.status,
      recurrence: t.recurrence,
      deadline: t.deadline,
      assignedTo: t.assigned_to,
      createdBy: t.created_by,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      clientId: client?.id ?? null,
      clientName: client?.name ?? "Client",
    };
  });

  return NextResponse.json({ tasks: enriched });
}
