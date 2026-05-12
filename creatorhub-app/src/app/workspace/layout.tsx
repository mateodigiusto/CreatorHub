/**
 * `/workspace/*` — client-facing portal.
 *
 * Resolves the single client the logged-in user has access to via
 * `client_memberships`. If the user has zero memberships, 404. If they
 * have multiple, redirect to `/workspace/pick` so they can choose which
 * one to enter.
 *
 * Bypasses the agency AppShell entirely — workspace users never see the
 * agency Sidebar or Topbar. The layout owns its own header + sub-nav.
 */

import type { ReactNode } from "react";
import {
  listWorkspaceClients,
  requireWorkspaceAccess,
} from "@/lib/auth/require-workspace-access";
import { WorkspaceProvider } from "@/components/agency/workspace/WorkspaceContext";
import { WorkspaceHeader } from "@/components/agency/workspace/WorkspaceHeader";
import { WorkspaceSubNav } from "@/components/agency/workspace/WorkspaceSubNav";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const viewer = await requireWorkspaceAccess();
  const all = await listWorkspaceClients();

  return (
    <WorkspaceProvider
      client={viewer.client}
      accessRole={viewer.accessRole}
    >
      <div className="flex min-h-screen flex-col bg-bg">
        <WorkspaceHeader hasMultiple={all.length > 1} />
        <WorkspaceSubNav />
        <main className="flex-1">{children}</main>
      </div>
    </WorkspaceProvider>
  );
}
