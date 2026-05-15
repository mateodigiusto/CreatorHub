/**
 * /settings/team — agency staff management.
 *
 *   • Members  — everyone in `organization_memberships`, with role + admin.
 *   • Invites  — pending `organization_invites` (email-targeted, tokened).
 *   • Invite form — admins invite teammates by email + role.
 *
 * Agency-staff can view; only admins can invite / change roles / remove
 * (the `TeamView` actions are gated, and the APIs enforce it again).
 * Data is read with the service-role client, scoped by the authenticated
 * org id — `users` / `profiles` for other members aren't reachable via RLS.
 */

import { requireAgency } from "@/lib/auth/require-org";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { TeamView } from "@/components/team/TeamView";
import type { TeamMember, TeamInvite } from "@/components/team/TeamView";

export const dynamic = "force-dynamic";

type MembershipRow = {
  id: string;
  profile_id: string;
  role: "user" | "editor" | "director";
  is_admin: boolean;
  created_at: string;
};

type InviteRow = {
  id: string;
  email: string;
  role: "user" | "editor" | "director";
  is_admin: boolean;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export default async function TeamPage() {
  const session = await requireAgency();
  const orgId = session.organization.id;
  const service = getSupabaseServiceRole();

  const [membersRes, invitesRes] = await Promise.all([
    service
      .from("organization_memberships")
      .select("id, profile_id, role, is_admin, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true }),
    service
      .from("organization_invites")
      .select("id, email, role, is_admin, expires_at, accepted_at, created_at")
      .eq("organization_id", orgId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const memberRows = (membersRes.data ?? []) as unknown as MembershipRow[];
  const profileIds = memberRows.map((m) => m.profile_id);

  const [usersRes, profilesRes] = await Promise.all([
    profileIds.length
      ? service.from("users").select("id, email").in("id", profileIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? service
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);
  const emailById = new Map(
    ((usersRes.data ?? []) as unknown as Array<{ id: string; email: string }>).map(
      (u) => [u.id, u.email],
    ),
  );
  const nameById = new Map(
    (
      (profilesRes.data ?? []) as unknown as Array<{
        user_id: string;
        display_name: string | null;
      }>
    ).map((p) => [p.user_id, p.display_name]),
  );

  const members: TeamMember[] = memberRows.map((m) => ({
    id: m.id,
    profileId: m.profile_id,
    email: emailById.get(m.profile_id) ?? "Unknown",
    displayName: nameById.get(m.profile_id) ?? null,
    role: m.role,
    isAdmin: m.is_admin,
    isSelf: m.profile_id === session.userId,
  }));

  /* Show all unaccepted invites — the redeem flow rejects expired tokens,
     so a stale row here is cosmetic only. (Filtering by `now` in a server
     component trips the react-hooks/purity rule.) */
  const invites: TeamInvite[] = (
    (invitesRes.data ?? []) as unknown as InviteRow[]
  ).map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    isAdmin: r.is_admin,
    expiresAt: r.expires_at,
  }));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Team"
        description="The people in your agency — invite editors and admins, manage their access."
      />
      <TeamView
        members={members}
        invites={invites}
        isAdmin={session.isAdmin}
        organizationName={session.organization.name}
      />
    </div>
  );
}
