/**
 * Agency-clients session resolver.
 *
 * Returns the current user's organization context — the single source of
 * truth all Phase 2+ routes & components read for `who is this user, which
 * org are they acting on behalf of, what's their role, and what plan are
 * they on?`. The shape matches the contract documented in
 * `src/lib/agency/_phase1_deps.ts`.
 *
 * Multi-org-per-user (Phase 9): the active org is resolved by
 * `resolveActiveOrgId()` — it reads the `creatorhub-active-org` cookie,
 * re-verifies membership, and silently falls back to the user's first
 * membership when the cookie is missing or stale. Single-org users are
 * unaffected: with no cookie, the fallback is the same first-membership
 * query this resolver used pre-Phase-9.
 *
 * Memoized per request via React `cache()` so a server component tree
 * + its API route can both call `getSession()` without re-querying.
 */

import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveOrgId } from "@/lib/orgs/active-org";

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

export const getSession = cache(async (): Promise<AgencySession | null> => {
  const supabase = await getSupabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  /* Phase 9 — pick the org the request is acting on (cookie-pinned, with
     a re-verified-membership fallback to the user's first org). */
  const activeOrgId = await resolveActiveOrgId({ supabase, userId: user.id });
  if (!activeOrgId) return null;

  const { data, error } = await supabase
    .from("organization_memberships")
    .select(
      "role, is_admin, organization:organizations ( id, slug, name, kind, plan, subscription_status )",
    )
    .eq("profile_id", user.id)
    .eq("organization_id", activeOrgId)
    .maybeSingle<MembershipRow>();

  if (error || !data || !data.organization) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    organization: {
      id: data.organization.id,
      slug: data.organization.slug,
      name: data.organization.name,
      kind: data.organization.kind,
    },
    orgRole: data.role,
    isAdmin: data.is_admin,
    plan: data.organization.plan,
    subscriptionStatus: data.organization.subscription_status,
  };
});
