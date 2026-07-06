/**
 * Rank-based + admin-flag gates on top of `requireOrg`.
 *
 *   await requireOrgRole("director")   // user < editor < director
 *   await requireOrgAdmin()            // checks the orthogonal is_admin flag
 *
 * Insufficient role / not admin → redirect to /clients with an error query
 * param so the UI can surface the reason.
 */

import { redirect } from "next/navigation";
import { requireOrg } from "./require-org";
import type { AgencySession, OrgRole } from "./session";

const RANK: Record<OrgRole, number> = { user: 1, editor: 2, director: 3 };

export async function requireOrgRole(min: OrgRole): Promise<AgencySession> {
  const session = await requireOrg();
  if (RANK[session.orgRole] < RANK[min]) redirect("/clients?error=forbidden");
  return session;
}

export async function requireOrgAdmin(): Promise<AgencySession> {
  const session = await requireOrg();
  if (!session.isAdmin) redirect("/clients?error=admin_required");
  return session;
}
