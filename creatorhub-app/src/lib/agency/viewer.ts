/**
 * Viewer-role types shared between the agency-side and client-facing
 * surfaces. The same page component can be rendered in either context;
 * the `ViewerRole` value tells the component how to behave.
 *
 * Used by:
 *   - `/workspace/*` pages (always one of `client_owner` | `team_assigned`)
 *   - `/clients/[slug]/*` pages (always `agency_staff` for now — the agency
 *     never views as a client. Kept for symmetry.)
 *
 * See docs/plans/agency-clients-module.md §7 for the capability matrix.
 */

import type { ClientAccessRole } from "@/lib/agency/types";

export type ViewerRole = "agency_staff" | ClientAccessRole;

export function isClientViewer(
  role: ViewerRole,
): role is ClientAccessRole {
  return role === "client_owner" || role === "team_assigned";
}

/**
 * Can this viewer see comments / notes flagged `is_internal=true`?
 * Mirrors the RLS policy on `content_comments`; rendered here so the UI
 * can hide the toggle in the comment composer.
 */
export function canSeeInternal(role: ViewerRole): boolean {
  return role === "agency_staff";
}

/**
 * Can this viewer edit the brand profile / strategy?
 * `client_owner` edits their own; `team_assigned` is read-only on brand
 * fields. Agency staff always edit.
 */
export function canEditBrand(role: ViewerRole): boolean {
  return role === "agency_staff" || role === "client_owner";
}

/**
 * Can this viewer move pipeline cards across columns?
 * Agency staff: yes. `client_owner`: no (review only). `team_assigned`:
 * yes but only on assigned cards — the assigned-card check is enforced
 * server-side, not here.
 */
export function canMovePipelineCards(role: ViewerRole): boolean {
  return role === "agency_staff" || role === "team_assigned";
}

/** Can this viewer create new pipeline cards? */
export function canCreatePipelineCards(role: ViewerRole): boolean {
  return role === "agency_staff" || role === "team_assigned";
}

/** Can this viewer mark an asset video `approved`? */
export function canApproveVideo(role: ViewerRole): boolean {
  return role === "agency_staff" || role === "client_owner";
}

/** Can this viewer upload to the asset library? */
export function canUploadAssets(role: ViewerRole): boolean {
  return role === "agency_staff";
}
