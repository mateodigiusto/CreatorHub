/**
 * Base-role + admin-flag helpers for the agency module.
 *
 * RLS gates cross-tenant access. These helpers gate in-tenant escalations
 * (e.g. "only directors edit internal notes", "only admins delete a
 * client"). They are read by route handlers, not by RLS.
 *
 * See docs/plans/agency-clients-module.md §7 for the full matrix.
 */

import type { AgencySession, OrgRole } from "./_phase1_deps";

const RANK: Record<OrgRole, number> = { user: 1, editor: 2, director: 3 };

export function hasMinRole(session: AgencySession, min: OrgRole): boolean {
  return RANK[session.orgRole] >= RANK[min];
}

export function isOrgStaff(session: AgencySession | null): session is AgencySession {
  // Any session with a resolved org is staff. Client-side users (creators)
  // live in client_memberships and never have an `organization` resolved
  // via `getSession()`; they're routed to /workspace/* instead.
  return !!session?.organization;
}

export function canEditInternalNotes(session: AgencySession): boolean {
  return session.orgRole === "director";
}

export function canCreateClient(session: AgencySession): boolean {
  // Per plan §7: user + director can create; editor cannot.
  return session.orgRole !== "editor";
}

export function canDeleteClient(session: AgencySession): boolean {
  return session.isAdmin;
}

export function canPreviewAsClient(session: AgencySession): boolean {
  return session.organization.kind === "agency" && session.orgRole === "director";
}

export function canManageOrgMembers(session: AgencySession): boolean {
  return session.isAdmin;
}

export function canManageBilling(session: AgencySession): boolean {
  return session.isAdmin;
}
