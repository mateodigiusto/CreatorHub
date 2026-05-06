/**
 * GET  /api/clients   — list the user's relationships (manager + creator views).
 * POST /api/clients   — invite a creator by email.
 *
 * RLS auto-scopes the GET so we don't need explicit user_id filters; the
 * `creator_relationships_self_select` policy handles it. POST is gated by
 * the route itself + `creator_relationships_manager_insert` policy.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import {
  findUserByEmail,
  generateInviteToken,
  sendAuthInvite,
} from "@/lib/clients/invite";
import { notify } from "@/lib/notifications";
import { newInviteEmail } from "@/lib/email/templates";
import type { RelationshipSummary } from "@/lib/clients/types";

type RelationshipRow = {
  id: string;
  manager_id: string;
  creator_id: string | null;
  invited_email: string | null;
  status: RelationshipSummary["status"];
  created_at: string;
  accepted_at: string | null;
  ended_at: string | null;
  expires_at: string;
};

type CounterpartyRow = {
  id: string;
  email: string;
  display_name: string | null;
};

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ relationships: [] }, { status: 200 });
  }
  const userId = userRes.user.id;

  const { data: rows } = await supabase
    .from("creator_relationships")
    .select(
      "id, manager_id, creator_id, invited_email, status, created_at, accepted_at, ended_at, expires_at",
    )
    .order("created_at", { ascending: false })
    .returns<RelationshipRow[]>();

  if (!rows || rows.length === 0) {
    return NextResponse.json({ relationships: [] });
  }

  /* Resolve counterparty display info. RLS lets us see the relationship
     row but not arbitrary other-user rows — use the service-role client
     to fetch just the email + display_name for the UUIDs we already
     legitimately know about. */
  const counterpartyIds = Array.from(
    new Set(
      rows
        .map((r) => (r.manager_id === userId ? r.creator_id : r.manager_id))
        .filter((x): x is string => x !== null),
    ),
  );

  let counterparties: Record<string, CounterpartyRow> = {};
  if (counterpartyIds.length > 0) {
    const admin = getSupabaseServiceRole();
    const { data: cpRows } = await admin
      .from("users")
      .select("id, email, display_name")
      .in("id", counterpartyIds)
      .returns<CounterpartyRow[]>();
    counterparties = Object.fromEntries((cpRows ?? []).map((c) => [c.id, c]));
  }

  const relationships: RelationshipSummary[] = rows.map((r) => {
    const perspective = r.manager_id === userId ? "manager" : "creator";
    const counterpartyId =
      perspective === "manager" ? r.creator_id : r.manager_id;
    const cp = counterpartyId ? counterparties[counterpartyId] : null;
    return {
      id: r.id,
      perspective,
      status: r.status,
      counterpartyName: cp?.display_name ?? null,
      counterpartyEmail: cp?.email ?? r.invited_email,
      createdAt: r.created_at,
      acceptedAt: r.accepted_at,
      endedAt: r.ended_at,
      expiresAt: r.expires_at,
    };
  });

  return NextResponse.json({ relationships });
}

type PostBody = { email?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
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

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (email === userRes.user.email?.toLowerCase()) {
    return NextResponse.json({ error: "self_invite" }, { status: 400 });
  }

  /* Cheap rate-limit guard: max 5 pending invites per manager. Stops a
     compromised account from spamming the auth invite endpoint. */
  const { count: pendingCount } = await supabase
    .from("creator_relationships")
    .select("*", { count: "exact", head: true })
    .eq("manager_id", userRes.user.id)
    .eq("status", "pending");
  if ((pendingCount ?? 0) >= 5) {
    return NextResponse.json({ error: "too_many_pending" }, { status: 429 });
  }

  /* Check whether the invitee already has a CreatorHub account. If yes,
     create the relationship as `active` directly and push a notification —
     no email send needed (and Supabase's invite would fail anyway). */
  const existingUserId = await findUserByEmail(email);

  if (existingUserId) {
    /* Dedupe: don't allow two relationships between the same pair. */
    const { data: existingRel } = await supabase
      .from("creator_relationships")
      .select("id, status")
      .eq("manager_id", userRes.user.id)
      .eq("creator_id", existingUserId)
      .order("created_at", { ascending: false })
      .returns<Array<{ id: string; status: string }>>()
      .limit(1)
      .maybeSingle();

    if (existingRel && ["pending", "active"].includes(existingRel.status)) {
      return NextResponse.json({ id: existingRel.id, ok: true, deduped: true });
    }

    const { data, error } = await supabase
      .from("creator_relationships")
      .insert({
        manager_id: userRes.user.id,
        creator_id: existingUserId,
        invited_email: email,
        invite_token: generateInviteToken(),
        status: "active",
        accepted_at: new Date().toISOString(),
      } as never)
      .select("id")
      .returns<Array<{ id: string }>>()
      .single();
    if (error || !data) {
      log.error("clients.invite_existing_failed", error ?? new Error("no row"));
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    const managerName = userRes.user.email?.split("@")[0] ?? "Someone";
    await notify({
      recipientId: existingUserId,
      kind: "invite",
      body: `${userRes.user.email ?? "Someone"} added you as a managed creator`,
      targetType: "relationship",
      targetId: data.id,
      email: newInviteEmail({
        recipientName: email.split("@")[0],
        managerName,
        relationshipId: data.id,
      }),
    });

    return NextResponse.json({
      id: data.id,
      ok: true,
      kind: "instant",
    });
  }

  /* New email: insert pending row + send Supabase auth invite. The
     `promote_pending_invites` trigger flips this to `active` once the
     invitee signs up via the magic link. */
  const inviteToken = generateInviteToken();
  const { data, error } = await supabase
    .from("creator_relationships")
    .insert({
      manager_id: userRes.user.id,
      invited_email: email,
      invite_token: inviteToken,
      status: "pending",
    } as never)
    .select("id")
    .returns<Array<{ id: string }>>()
    .single();
  if (error || !data) {
    log.error("clients.invite_pending_failed", error ?? new Error("no row"));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const redirectTo = `${origin}/clients/${data.id}`;
  const emailSent = await sendAuthInvite(email, redirectTo);

  return NextResponse.json({
    id: data.id,
    ok: true,
    kind: "pending",
    emailSent,
  });
}
