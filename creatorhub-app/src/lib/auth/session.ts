/**
 * Agency-clients session resolver.
 *
 * Returns the current user's organization context — the single source of
 * truth all Phase 2+ routes & components read for `who is this user, which
 * org are they acting on behalf of, what's their role, and what plan are
 * they on?`. The shape matches the contract documented in
 * `src/lib/agency/_phase1_deps.ts`.
 *
 * Multi-org-per-user (Phase 9) lands here later: this resolver will read a
 * `creatorhub-active-org` cookie to disambiguate; in v1 we always pick the
 * user's first membership.
 *
 * Memoized per request via React `cache()` so a server component tree
 * + its API route can both call `getSession()` without re-querying.
 */

import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";

export type OrgRole = "user" | "editor" | "director";
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
  organization: { id: string; slug: string; name: string };
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
    plan: Plan;
    subscription_status: SubscriptionStatus;
  } | null;
};

export const getSession = cache(async (): Promise<AgencySession | null> => {
  const supabase = await getSupabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("organization_memberships")
    .select(
      "role, is_admin, organization:organizations ( id, slug, name, plan, subscription_status )",
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<MembershipRow>();

  if (error || !data || !data.organization) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    organization: {
      id: data.organization.id,
      slug: data.organization.slug,
      name: data.organization.name,
    },
    orgRole: data.role,
    isAdmin: data.is_admin,
    plan: data.organization.plan,
    subscriptionStatus: data.organization.subscription_status,
  };
});
