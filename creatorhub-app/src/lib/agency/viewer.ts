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

/*
 * Capability model — kept deliberately in lockstep with the RLS policies
 * from migrations 0034/0035. Client-side viewers (`client_owner` /
 * `team_assigned`) are **view + comment only**: every write policy on
 * `content_items`, `brand_profiles`, `asset_videos`, `asset_links` is
 * `is_org_staff`-only, and `content_comments` is the single exception
 * (clients may write non-internal comments). These helpers exist so the
 * UI never renders a control that RLS would just reject — they are NOT
 * the security boundary; RLS is.
 */

/**
 * Can this viewer see — and post — comments flagged `is_internal=true`?
 * Internal comments are staff-only on both read and write
 * (`content_comments` RLS gates clients to `is_internal = false`).
 */
export function canSeeInternal(role: ViewerRole): boolean {
  return role === "agency_staff";
}

/** Can this viewer edit the brand profile / strategy? Staff only. */
export function canEditBrand(role: ViewerRole): boolean {
  return role === "agency_staff";
}

/** Can this viewer move pipeline cards across columns? Staff only. */
export function canMovePipelineCards(role: ViewerRole): boolean {
  return role === "agency_staff";
}

/** Can this viewer create new pipeline cards? Staff only. */
export function canCreatePipelineCards(role: ViewerRole): boolean {
  return role === "agency_staff";
}

/** Can this viewer edit or delete a pipeline card's content? Staff only. */
export function canEditContent(role: ViewerRole): boolean {
  return role === "agency_staff";
}

/** Can this viewer mark an asset video `approved`? Staff only. */
export function canApproveVideo(role: ViewerRole): boolean {
  return role === "agency_staff";
}

/** Can this viewer upload to the asset library? Staff only. */
export function canUploadAssets(role: ViewerRole): boolean {
  return role === "agency_staff";
}

/**
 * Can this viewer post a (non-internal) comment? Everyone with workspace
 * access can — this is the one write a client-side viewer gets.
 */
export function canComment(_role: ViewerRole): boolean {
  return true;
}
