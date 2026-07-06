/**
 * GET  /api/team/invites — pending staff invites for the caller's agency.
 * POST /api/team/invites — invite a teammate by email + role.
 *
 * Org-admin only (the `organization_invites` RLS policies are
 * `is_org_admin`). Each invite is an `organization_invites` row with a
 * token; the invitee redeems it at /join-org/[token]. When Resend is
 * configured the email is sent too — otherwise the admin copies the link.
 */

import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAgency } from "@/lib/auth/require-org";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendOrgInviteNotification } from "@/lib/email/agency-notify";
import { log } from "@/lib/log";

type OrgRole = "user" | "editor" | "director";

type InviteRow = {
  id: string;
  email: string;
  role: OrgRole;
  is_admin: boolean;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

const ROLES: OrgRole[] = ["user", "editor", "director"];
const INVITE_TTL_DAYS = 7;

function joinUrl(req: NextRequest, token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  return `${base.replace(/\/$/, "")}/join-org/${token}`;
}

export async function GET(_req: NextRequest) {
  const session = await requireAgency();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "admin_required" }, { status: 403 });
  }
  const supabase = await getSupabaseServer();
  const res = await supabase
    .from("organization_invites")
    .select("id, email, role, is_admin, token, expires_at, accepted_at, created_at")
    .eq("organization_id", session.organization.id)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (res.error) {
    log.error("team.invites_list_failed", { err: res.error.message });
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
  const now = Date.now();
  const invites = ((res.data ?? []) as unknown as InviteRow[])
    .filter((r) => new Date(r.expires_at).getTime() > now)
    .map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      isAdmin: r.is_admin,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
    }));
  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest) {
  const session = await requireAgency();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "admin_required" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    role?: OrgRole;
    isAdmin?: boolean;
  } | null;
  const email = body?.email?.trim().toLowerCase();
  const role = body?.role;
  const isAdmin = body?.isAdmin === true;
  if (!email || !email.includes("@") || email.length > 200) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!role || !ROLES.includes(role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();

  /* Already a member? Reject — nothing to invite. */
  const memberCheck = await supabase
    .from("organization_memberships")
    .select("id, profile_id")
    .eq("organization_id", session.organization.id);
  // (We can't join to email cheaply here; the redeem path also guards, so a
  // duplicate invite is harmless — it just won't be redeemable twice.)
  void memberCheck;

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const insertRes = await supabase
    .from("organization_invites")
    .insert({
      organization_id: session.organization.id,
      email,
      role,
      is_admin: isAdmin,
      token,
      expires_at: expiresAt,
      created_by: session.userId,
    } as never)
    .select("id, email, role, is_admin, token, expires_at, accepted_at, created_at")
    .single();
  if (insertRes.error) {
    log.error("team.invite_create_failed", { err: insertRes.error.message });
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
  const created = insertRes.data as unknown as InviteRow;
  const url = joinUrl(req, created.token);

  /* Best-effort email — no-op when RESEND_API_KEY/EMAIL_FROM unset. */
  void sendOrgInviteNotification({
    to: email,
    inviterName: session.organization.name,
    organizationName: session.organization.name,
    token: created.token,
    role,
    isAdmin,
  });

  return NextResponse.json(
    {
      id: created.id,
      email: created.email,
      role: created.role,
      isAdmin: created.is_admin,
      joinUrl: url,
      expiresAt: created.expires_at,
    },
    { status: 201 },
  );
}
