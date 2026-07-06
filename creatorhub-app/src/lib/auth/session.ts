/**
 * Agency-clients session resolver.
 *
 * Returns the current user's organization context — the single source of
 * truth all Phase 2+ routes & components read for `who is this user, which
 * org are they acting on behalf of, what's their role, and what plan are
 * they on?`. The shape matches the contract documented in
 * `src/lib/agency/_phase1_deps.ts`.
 *
 * Multi-org-per-user (Phase 9): the active org is read from the
 * `creatorhub-active-org` cookie (`getActiveOrgIdFromCookie()`). A cookie
 * hit resolves in one membership+org join; a missing / malformed / stale
 * cookie falls back to the user's first membership — the exact
 * pre-Phase-9 behavior, so single-org users are unaffected.
 *
 * Memoized per request via React `cache()` so a server component tree
 * + its API route can both call `getSession()` without re-querying.
 */

import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getActiveOrgIdFromCookie } from "@/lib/orgs/active-org";

const MEMBERSHIP_SELECT =
  "role, is_admin, organization:organizations ( id, slug, name, kind, plan, subscription_status )";

export type OrgRole = "user" | "editor" | "director";
export type OrgKind = "agency" | "solo";
export type Plan = "free" | "starter" | "pro" | "scale";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type AgencySession = {
  userId: string;
  email: string;
  /**
   * `kind` distinguishes a real agency (manages clients) from a solo
   * account (an org of one, agency UI hidden). Both have an org membership;
   * the kind decides which surface they see.
   */
  organization: { id: string; slug: string; name: string; kind: OrgKind };
  orgRole: OrgRole;
  isAdmin: boolean;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
};

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

function toSession(userId: string, email: string, row: MembershipRow): AgencySession | null {
  if (!row.organization) return null;
  return {
    userId,
    email,
    organization: {
      id: row.organization.id,
      slug: row.organization.slug,
      name: row.organization.name,
      kind: row.organization.kind,
    },
    orgRole: row.role,
    isAdmin: row.is_admin,
    plan: row.organization.plan,
    subscriptionStatus: row.organization.subscription_status,
  };
}

export const getSession = cache(async (): Promise<AgencySession | null> => {
  const supabase = await getSupabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const email = user.email ?? "";

  /* Phase 9 — multi-org. Happy path: the `creatorhub-active-org` cookie
     pins an org, and a single membership+org join resolves it. If the
     cookie is missing, malformed, or points at an org the user was
     removed from, fall through to the first-membership query (the exact
     pre-Phase-9 behavior). A real DB error throws — never silently
     downgrade a valid session to "no org". */
  const cookieOrgId = await getActiveOrgIdFromCookie();
  if (cookieOrgId) {
    const { data, error } = await supabase
      .from("organization_memberships")
      .select(MEMBERSHIP_SELECT)
      .eq("profile_id", user.id)
      .eq("organization_id", cookieOrgId)
      .maybeSingle<MembershipRow>();
    if (error) throw new Error(`getSession: active-org lookup failed: ${error.message}`);
    if (data) return toSession(user.id, email, data);
    /* Stale cookie — fall through to the first-membership fallback. */
  }

  const { data, error } = await supabase
    .from("organization_memberships")
    .select(MEMBERSHIP_SELECT)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<MembershipRow>();
  if (error) throw new Error(`getSession: membership lookup failed: ${error.message}`);
  if (!data) return null;
  return toSession(user.id, email, data);
});
