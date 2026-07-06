/**
 * POST /api/join/[token] — redeem a client join link.
 *
 * The caller must be authenticated (the public /join/[token] page bounces
 * anonymous visitors through /login first). We look the token up with the
 * service-role client because the redeemer isn't a member of anything yet,
 * so RLS would hide every row they need.
 *
 * Outcome depends on the org's `client_approval_required` flag:
 *   • required  → client_memberships row is `pending`; an admin approves it
 *                 from the inbox. Response: { status: 'pending' }.
 *   • not req'd → row is `active` immediately. Response: { status: 'active' }.
 *
 * Either way an `inbox_events` row is written so the agency sees it.
 * Idempotent: a caller who already holds a membership gets their current
 * status back without a duplicate insert.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type Params = { params: Promise<{ token: string }> };

type InviteRow = {
  id: string;
  organization_id: string;
  client_id: string;
  access_role: "client_owner" | "team_assigned";
  expires_at: string | null;
  revoked_at: string | null;
  created_by: string | null;
};

export async function POST(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const service = getSupabaseServiceRole();

  /* Resolve the invite. Service role — the redeemer can't see these rows. */
  const inviteRes = await service
    .from("client_invites")
    .select(
      "id, organization_id, client_id, access_role, expires_at, revoked_at, created_by",
    )
    .eq("token", token)
    .maybeSingle();
  const invite = (inviteRes.data ?? null) as InviteRow | null;
  if (!invite) {
    return NextResponse.json({ error: "invalid_invite" }, { status: 404 });
  }
  if (invite.revoked_at) {
    return NextResponse.json({ error: "revoked_invite" }, { status: 410 });
  }
  if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
    return NextResponse.json({ error: "expired_invite" }, { status: 410 });
  }

  /* Already a member? Return current status; if previously denied, let them
     re-request by flipping the row back per the current approval setting. */
  const existingRes = await service
    .from("client_memberships")
    .select("id, status")
    .eq("client_id", invite.client_id)
    .eq("profile_id", user.id)
    .maybeSingle();
  const existing = (existingRes.data ?? null) as
    | { id: string; status: "pending" | "active" | "denied" }
    | null;
  if (existing && existing.status !== "denied") {
    return NextResponse.json({ status: existing.status });
  }

  /* Resolve the org's approval setting + the client display name. */
  const orgRes = await service
    .from("organizations")
    .select("name, client_approval_required")
    .eq("id", invite.organization_id)
    .maybeSingle();
  const org = (orgRes.data ?? null) as
    | { name: string; client_approval_required: boolean }
    | null;
  const clientRes = await service
    .from("clients")
    .select("display_name")
    .eq("id", invite.client_id)
    .maybeSingle();
  const clientName =
    (clientRes.data as { display_name: string } | null)?.display_name ??
    "the workspace";

  const approvalRequired = org?.client_approval_required ?? true;
  const status: "pending" | "active" = approvalRequired ? "pending" : "active";
  const nowIso = new Date().toISOString();

  /* `client_memberships.profile_id` FKs to `profiles(user_id)`. A brand-new
     user accepting a join link signed up just moments ago — the
     `on_auth_user_created` trigger creates their `users` row but NOT a
     `profiles` row, so the membership insert would fail on the FK.
     Upsert a minimal profile first; they can fill it in via the workspace
     later. The `creator_type` / `niche` placeholders are required NOT-NULL
     columns with no default. */
  await service.from("profiles").upsert(
    {
      user_id: user.id,
      creator_type: "creator",
      niche: "general",
      primary_goal: "audience",
      schema_version: 2,
    } as never,
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  /* Upsert the membership. organization_id is also enforced by the
     sync_client_membership_org trigger, but we set it explicitly. */
  const membershipFields = {
    organization_id: invite.organization_id,
    client_id: invite.client_id,
    profile_id: user.id,
    access_role: invite.access_role,
    status,
    invited_by: invite.created_by,
    approved_at: status === "active" ? nowIso : null,
    approved_by: null,
  };

  if (existing) {
    const upd = await service
      .from("client_memberships")
      .update(membershipFields as never)
      .eq("id", existing.id);
    if (upd.error) {
      log.error("join.rejoin_failed", { token, err: upd.error.message });
      return NextResponse.json({ error: "join_failed" }, { status: 500 });
    }
  } else {
    const ins = await service
      .from("client_memberships")
      .insert(membershipFields as never);
    if (ins.error) {
      log.error("join.insert_failed", { token, err: ins.error.message });
      return NextResponse.json({ error: "join_failed" }, { status: 500 });
    }
  }

  /* Inbox feed item for the agency. */
  const who = user.email ?? "Someone";
  const inboxBody =
    status === "pending"
      ? `${who} requested access to ${clientName}.`
      : `${who} joined ${clientName}.`;
  const inboxRes = await service.from("inbox_events").insert({
    organization_id: invite.organization_id,
    kind: status === "pending" ? "client_join_request" : "client_joined",
    client_id: invite.client_id,
    actor_id: user.id,
    body: inboxBody,
  } as never);
  if (inboxRes.error) {
    /* Non-fatal — the membership is what matters; log and move on. */
    log.warn("join.inbox_event_failed", { token, err: inboxRes.error.message });
  }

  log.info("join.redeemed", {
    token,
    clientId: invite.client_id,
    status,
    userId: user.id,
  });
  return NextResponse.json({ status });
}
