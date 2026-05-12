/**
 * GET  /api/clients/[slug]/members — list members of this client.
 * POST /api/clients/[slug]/members — invite an existing user by email.
 *
 * Member lookup is by email against `users` (the app-side mirror of
 * auth.users populated by the on_auth_user_created trigger). If no
 * matching user exists, return 404 — they need to sign up first. A
 * full invite-by-email flow with Resend is Phase 8.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireClientAccess } from "@/lib/auth/require-client-access";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { sendClientWorkspaceInviteNotification } from "@/lib/email/agency-notify";
import type {
  ClientAccessRole,
  ClientMembershipWithProfile,
} from "@/lib/agency/types";

type Params = { params: Promise<{ slug: string }> };

type MembershipRow = {
  id: string;
  organization_id: string;
  client_id: string;
  profile_id: string;
  access_role: ClientAccessRole;
  invited_by: string | null;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
};

type UserRow = { id: string; email: string };

const ROLES: ClientAccessRole[] = ["client_owner", "team_assigned"];

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { client } = await requireClientAccess(slug);
  const supabase = await getSupabaseServer();
  const memberRes = await supabase
    .from("client_memberships")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: true });
  if (memberRes.error) {
    log.error("client_members.list_failed", { slug, err: memberRes.error.message });
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
  const rows = (memberRes.data ?? []) as unknown as MembershipRow[];
  const ids = rows.map((r) => r.profile_id);

  const service = getSupabaseServiceRole();
  const profilesRes = await service
    .from("profiles")
    .select("user_id, display_name, handle, avatar_url")
    .in("user_id", ids);
  const usersRes = await service.from("users").select("id, email").in("id", ids);
  const profiles = (profilesRes.data ?? []) as unknown as ProfileRow[];
  const users = (usersRes.data ?? []) as unknown as UserRow[];

  const profileById = new Map(profiles.map((p) => [p.user_id, p]));
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  const members: ClientMembershipWithProfile[] = rows.map((r) => {
    const p = profileById.get(r.profile_id);
    return {
      id: r.id,
      organizationId: r.organization_id,
      clientId: r.client_id,
      profileId: r.profile_id,
      accessRole: r.access_role,
      invitedBy: r.invited_by,
      createdAt: r.created_at,
      profile: p
        ? {
            userId: r.profile_id,
            displayName: p.display_name,
            handle: p.handle,
            avatarUrl: p.avatar_url,
          }
        : null,
      email: emailById.get(r.profile_id),
    };
  });

  return NextResponse.json({ members });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { session, client } = await requireClientAccess(slug);

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    accessRole?: ClientAccessRole;
  } | null;
  const email = body?.email?.trim().toLowerCase();
  const accessRole = body?.accessRole;
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!accessRole || !ROLES.includes(accessRole)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  const service = getSupabaseServiceRole();

  const userRes = await service
    .from("users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();
  const targetUser = (userRes.data ?? null) as unknown as UserRow | null;
  if (!targetUser) {
    return NextResponse.json(
      { error: "no_user", message: "No user with that email. Ask them to sign up first." },
      { status: 404 },
    );
  }

  const insertRes = await service.from("client_memberships").insert({
    organization_id: session.organization.id,
    client_id: client.id,
    profile_id: targetUser.id,
    access_role: accessRole,
    invited_by: session.userId,
  } as never);
  if (insertRes.error) {
    if (/duplicate key|unique/i.test(insertRes.error.message)) {
      return NextResponse.json({ error: "already_member" }, { status: 409 });
    }
    log.error("client_members.add_failed", { slug, err: insertRes.error.message });
    return NextResponse.json({ error: "add_failed" }, { status: 500 });
  }

  // Best-effort notification — no-op when RESEND_API_KEY/EMAIL_FROM unset.
  const inviterProfileRes = await service
    .from("profiles")
    .select("display_name")
    .eq("user_id", session.userId)
    .maybeSingle();
  const inviterRow = (inviterProfileRes.data ?? null) as { display_name: string | null } | null;
  const inviterName = inviterRow?.display_name ?? session.email;
  void sendClientWorkspaceInviteNotification({
    to: targetUser.email,
    inviterName,
    organizationName: session.organization.name,
    clientDisplayName: client.displayName,
    token: "",
    accessRole,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
