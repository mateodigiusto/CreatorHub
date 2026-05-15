/**
 * `/workspace/pipeline` — same kanban Phase 4 builds for
 * `/clients/[slug]/pipeline`, with two behavioural flips:
 *
 *   1. Drag-to-move is gated on `canMovePipelineCards(viewerRole)`. For
 *      `client_owner` the board is read-only (review only); for
 *      `team_assigned` it's interactive but the server enforces the
 *      "only on assigned cards" rule.
 *   2. The "+ Add idea" button is hidden for `client_owner`.
 *
 * The data fetch hits `/api/clients/[slug]/content`, which RLS already
 * filters to `visibility='client_visible'` for non-staff. The Phase 4
 * agent owns that handler — see Phase 7 NOTES for the gates Phase 4
 * still has to soften so workspace users can read it.
 */

import { WorkspacePipelineClient } from "./client";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

export const dynamic = "force-dynamic";

export default async function WorkspacePipelinePage() {
  const viewer = await requireWorkspaceAccess();
  return (
    <WorkspacePipelineClient
      slug={viewer.client.slug}
      viewerRole={viewer.accessRole}
    />
  );
}
