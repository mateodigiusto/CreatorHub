/**
 * POST /api/join-org/[token] — redeem a staff invite.
 *
 * The caller must be authenticated and signed in as the invited email (the
 * invite is email-targeted; matching it stops a leaked link from letting a
 * stranger into the agency). Looks the token up with the service-role
 * client because the redeemer isn't a member yet.
 *
 * On success: creates the `organization_memberships` row with the role +
 * admin flag baked into the invite, and stamps `accepted_at`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type Params = { params: Promise<{ token: string }> };

type InviteRow = {
  id: string;
  organization_id: string;
  email: string;
  role: "user" | "editor" | "director";
  is_admin: boolean;
  expires_at: string;
  accepted_at: string | null;
};

export async function POST(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const service = getSupabaseServiceRole();

  const inviteRes = await service
    .from("organization_invites")
    .select("id, organization_id, email, role, is_admin, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();
  const invite = (inviteRes.data ?? null) as InviteRow | null;
  if (!invite) {
    return NextResponse.json({ error: "invalid_invite" }, { status: 404 });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: "already_used" }, { status: 410 });
  }
  if (new Date(invite.expires_at) <= new Date()) {
    return NextResponse.json({ error: "expired_invite" }, { status: 410 });
  }

  /* The redeemer must be signed in as the invited email. */
  if ((user.email ?? "").toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      {
        error: "email_mismatch",
        message: `This invite is for ${invite.email}. Sign in with that email to accept.`,
      },
      { status: 403 },
    );
  }

  /* One org per user for v1 (multi-org is deferred). */
  const existing = await service
    .from("organization_memberships")
    .select("id, organization_id")
    .eq("profile_id", user.id)
    .limit(1);
  if (existing.data && existing.data.length > 0) {
    const row = existing.data[0] as { organization_id: string };
    if (row.organization_id === invite.organization_id) {
      return NextResponse.json({ ok: true, alreadyMember: true });
    }
    return NextResponse.json({ error: "already_in_org" }, { status: 409 });
  }

  /* A teammate who signed up just to accept this invite has no `profiles`
     row yet — the membership insert would succeed (FK is to `users`) but
     the sidebar's agency-only nav (Inbox / Team) keys off
     `profile.creator_type === 'agency'`, so they'd see a broken nav.
     Upsert a minimal agency profile so the sidebar lights up immediately. */
  await service.from("profiles").upsert(
    {
      user_id: user.id,
      creator_type: "agency",
      niche: "agency",
      primary_goal: "audience",
      schema_version: 2,
    } as never,
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  const ins = await service.from("organization_memberships").insert({
    organization_id: invite.organization_id,
    profile_id: user.id,
    role: invite.role,
    is_admin: invite.is_admin,
    invited_by: null,
  } as never);
  if (ins.error) {
    log.error("join_org.insert_failed", { token, err: ins.error.message });
    return NextResponse.json({ error: "join_failed" }, { status: 500 });
  }

  await service
    .from("organization_invites")
    .update({ accepted_at: new Date().toISOString() } as never)
    .eq("id", invite.id);

  log.info("join_org.redeemed", {
    orgId: invite.organization_id,
    role: invite.role,
    userId: user.id,
  });
  return NextResponse.json({ ok: true });
}
