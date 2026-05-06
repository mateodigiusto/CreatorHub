/**
 * GET  /api/clients/[id]/messages?since=ISO  — list messages in this thread
 * POST /api/clients/[id]/messages              — send a message
 *
 * The optional `since` cursor lets the polling client fetch only new
 * messages on each tick. If omitted, returns the most recent 100.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { notify } from "@/lib/notifications";
import { newMessageEmail } from "@/lib/email/templates";
import type { RelationshipMessageRow } from "@/lib/clients/types";

type DbMsgRow = {
  id: string;
  relationship_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const PAGE_LIMIT = 100;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = req.nextUrl.searchParams.get("since");

  let query = supabase
    .from("relationship_messages")
    .select("id, relationship_id, sender_id, body, created_at, read_at")
    .eq("relationship_id", id)
    .order("created_at", { ascending: true })
    .limit(PAGE_LIMIT);
  if (since) {
    query = query.gt("created_at", since);
  }

  const { data: rows } = await query.returns<DbMsgRow[]>();

  /* Mark inbound messages as read whenever they're fetched. Uses RLS
     (recipient-update policy) — sender can't change their own read_at. */
  const inboundUnread = (rows ?? []).filter(
    (r) => r.sender_id !== userRes.user!.id && !r.read_at,
  );
  if (inboundUnread.length > 0) {
    const ids = inboundUnread.map((r) => r.id);
    void supabase
      .from("relationship_messages")
      .update({ read_at: new Date().toISOString() } as never)
      .in("id", ids)
      .then(() => undefined);
  }

  const messages: RelationshipMessageRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    relationshipId: r.relationship_id,
    senderId: r.sender_id,
    body: r.body,
    createdAt: r.created_at,
    readAt: r.read_at,
  }));

  return NextResponse.json({ messages });
}

type PostBody = { body?: string };

const MAX_BODY = 4000;

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
  const text = (body.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "body_required" }, { status: 400 });
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: "body_too_long" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("relationship_messages")
    .insert({
      relationship_id: id,
      sender_id: userRes.user.id,
      body: text,
    } as never)
    .select("id, relationship_id, sender_id, body, created_at, read_at")
    .returns<DbMsgRow[]>()
    .single();
  if (error || !data) {
    log.error("clients.message_send_failed", error ?? new Error("no row"));
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  /* Push a notification to the counterparty. Service-role read of the
     relationship is fine — we already verified membership via RLS on the
     insert above. */
  const admin = getSupabaseServiceRole();
  const { data: rel } = await admin
    .from("creator_relationships")
    .select("manager_id, creator_id")
    .eq("id", id)
    .returns<Array<{ manager_id: string; creator_id: string | null }>>()
    .maybeSingle();
  if (rel) {
    const counterpartyId =
      rel.manager_id === userRes.user.id ? rel.creator_id : rel.manager_id;
    if (counterpartyId) {
      const senderName = userRes.user.email?.split("@")[0] ?? "Someone";
      await notify({
        recipientId: counterpartyId,
        kind: "message",
        body: text.slice(0, 80),
        targetType: "relationship",
        targetId: id,
        email: newMessageEmail({
          recipientName: "",
          senderName,
          preview: text.slice(0, 240),
          relationshipId: id,
        }),
      });
    }
  }

  return NextResponse.json({
    message: {
      id: data.id,
      relationshipId: data.relationship_id,
      senderId: data.sender_id,
      body: data.body,
      createdAt: data.created_at,
      readAt: data.read_at,
    } satisfies RelationshipMessageRow,
  });
}
