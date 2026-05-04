/**
 * GET   /api/notifications  — list notifications for this user
 * PATCH /api/notifications  — bulk mark as read (body: { ids?: string[] })
 *   - if no ids, marks everything unread as read
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import type { NotificationKind } from "@/lib/clients/types";

type DbNotificationRow = {
  id: string;
  recipient_id: string;
  kind: NotificationKind;
  target_type: string | null;
  target_id: string | null;
  body: string | null;
  created_at: string;
  read_at: string | null;
};

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const { data: rows } = await supabase
    .from("notifications")
    .select(
      "id, recipient_id, kind, target_type, target_id, body, created_at, read_at",
    )
    .eq("recipient_id", userRes.user.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<DbNotificationRow[]>();

  const notifications = (rows ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    targetType: r.target_type,
    targetId: r.target_id,
    body: r.body,
    createdAt: r.created_at,
    readAt: r.read_at,
  }));
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return NextResponse.json({ notifications, unreadCount });
}

type PatchBody = { ids?: string[] };

export async function PATCH(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PatchBody = {};
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    /* No body is fine — means "mark all read". */
  }

  let q = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() } as never)
    .eq("recipient_id", userRes.user.id)
    .is("read_at", null);
  if (body.ids && body.ids.length > 0) {
    q = q.in("id", body.ids);
  }
  const { error } = await q;
  if (error) {
    log.error("notifications.mark_read_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
