import { WorkspaceMetricsClient } from "./client";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

export const dynamic = "force-dynamic";

export default async function WorkspaceMetricsPage() {
  const viewer = await requireWorkspaceAccess();
  return <WorkspaceMetricsClient slug={viewer.client.slug} />;
}
