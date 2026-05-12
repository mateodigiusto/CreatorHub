import { WorkspaceCalendarClient } from "./client";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

export const dynamic = "force-dynamic";

export default async function WorkspaceCalendarPage() {
  const viewer = await requireWorkspaceAccess();
  return <WorkspaceCalendarClient slug={viewer.client.slug} />;
}
