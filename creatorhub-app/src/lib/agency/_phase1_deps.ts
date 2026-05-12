/**
 * Phase 1 dependency re-export — single seam between the parallel-built
 * Phase 2/3/4/5/6 code and the real Phase 1 auth/session module.
 *
 * Phases 2-6 were built in parallel by separate sessions; they all import
 * the same helpers from this path so the cutover is a single file to
 * rewrite. Phase 1 has now landed (see commits 4201e12 + 5039afd), so this
 * file just re-exports the real implementations from `@/lib/auth/*`.
 *
 * Future cleanup: once every Phase 2-6 import is updated to point directly
 * at `@/lib/auth/session` and friends, this file can be deleted.
 */

export {
  getSession,
  type AgencySession,
  type OrgRole,
  type Plan,
  type SubscriptionStatus,
} from "@/lib/auth/session";
export { requireOrg } from "@/lib/auth/require-org";
export { requireOrgRole, requireOrgAdmin } from "@/lib/auth/require-org-role";
