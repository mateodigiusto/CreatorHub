/**
 * Multi-org-per-user (Phase 9) shared types.
 */

import type {
  OrgRole,
  OrgKind,
  Plan,
  SubscriptionStatus,
} from "@/lib/auth/session";

/** One organization the current user belongs to, as listed in the
 *  OrgSwitcher dropdown. */
export type OrgSummary = {
  id: string;
  slug: string;
  name: string;
  kind: OrgKind;
  /** The caller's role + admin flag *in this org* (membership-scoped). */
  role: OrgRole;
  isAdmin: boolean;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  /** Whether this is the org the request is currently acting on. */
  isActive: boolean;
};

/** Cookie that pins the active org. UUID of the org, or absent. */
export const ACTIVE_ORG_COOKIE = "creatorhub-active-org";
