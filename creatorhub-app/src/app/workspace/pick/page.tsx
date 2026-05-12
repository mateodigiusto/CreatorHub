/**
 * `/workspace/pick` — client picker for users with multiple
 * `client_memberships` (rare, but supported).
 *
 * Submitting picks a slug and POSTs to `/api/workspace/pick`, which sets
 * the `creatorhub-workspace-slug` cookie and 303s back to
 * `/workspace/overview`. Subsequent visits to `/workspace/*` resolve to
 * that client until the cookie is cleared or another is picked.
 *
 * If the user has 0 memberships, the layout's `requireWorkspaceAccess`
 * would 404 before this page mounts. We still render the page for the
 * single-client case — harmless and gives them a confirm step.
 */

import { listWorkspaceClients } from "@/lib/auth/require-workspace-access";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

const ROLE_LABEL = {
  client_owner: "Owner",
  team_assigned: "Team",
} as const;

export default async function WorkspacePickPage() {
  const memberships = await listWorkspaceClients();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <PageHeader
        title="Choose a workspace"
        description="You have access to more than one creator workspace. Pick one to continue."
      />
      <div className="grid gap-3">
        {memberships.map(({ client, accessRole }) => (
          <form
            key={client.id}
            method="POST"
            action="/api/workspace/pick"
          >
            <input type="hidden" name="slug" value={client.slug} />
            <button type="submit" className="block w-full text-left">
              <Card lift className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold tracking-[-0.005em] text-text">
                      {client.displayName}
                    </span>
                    <Badge tone="accent">{ROLE_LABEL[accessRole]}</Badge>
                  </div>
                  {client.tagline && (
                    <p className="mt-1 text-[13px] text-muted">
                      {client.tagline}
                    </p>
                  )}
                </div>
                <span className="text-[12.5px] font-medium text-accent">
                  Enter →
                </span>
              </Card>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
