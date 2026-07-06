/**
 * Org-membership queries for the Phase 9 multi-org switcher.
 */

import type { getSupabaseServer } from "@/lib/supabase/server";
import type {
  OrgRole,
  OrgKind,
  Plan,
  SubscriptionStatus,
} from "@/lib/auth/session";
import type { OrgSummary } from "./types";

type ServerSupabase = Awaited<ReturnType<typeof getSupabaseServer>>;

type MembershipRow = {
  role: OrgRole;
  is_admin: boolean;
  organization: {
    id: string;
    slug: string;
    name: string;
    kind: OrgKind;
    plan: Plan;
    subscription_status: SubscriptionStatus;
  } | null;
};

/**
 * Every org the user belongs to, newest membership first. `activeOrgId`
 * stamps `isActive` on the matching row so the switcher can render the
 * checkmark without a second query.
 */
export async function listOrganizationsForUser(args: {
  supabase: ServerSupabase;
  userId: string;
  activeOrgId: string | null;
}): Promise<OrgSummary[]> {
  const { supabase, userId, activeOrgId } = args;

  const { data, error } = await supabase
    .from("organization_memberships")
    .select(
      "role, is_admin, organization:organizations ( id, slug, name, kind, plan, subscription_status )",
    )
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .returns<MembershipRow[]>();

  if (error || !data) return [];

  return data
    .filter((row): row is MembershipRow & { organization: NonNullable<MembershipRow["organization"]> } =>
      row.organization !== null,
    )
    .map((row) => ({
      id: row.organization.id,
      slug: row.organization.slug,
      name: row.organization.name,
      kind: row.organization.kind,
      role: row.role,
      isAdmin: row.is_admin,
      plan: row.organization.plan,
      subscriptionStatus: row.organization.subscription_status,
      isActive: row.organization.id === activeOrgId,
    }));
}
