"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useWorkspace } from "./WorkspaceContext";

const ROLE_LABEL = {
  client_owner: "Owner",
  team_assigned: "Team",
} as const;

/**
 * Top-of-workspace header. Shows the client display name + a small
 * "viewing as" chip so the user understands they're inside the
 * client-facing portal (not the agency admin).
 *
 * `hasMultiple` controls whether the "Switch client" link is shown —
 * resolved by the layout from `listWorkspaceClients()`.
 */
export function WorkspaceHeader({
  hasMultiple,
}: {
  hasMultiple: boolean;
}) {
  const { client, accessRole } = useWorkspace();
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface px-5 py-4">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-[18px] font-semibold tracking-[-0.005em] text-text">
            {client.displayName}
          </h1>
          {client.status !== "active" && (
            <Badge tone={client.status === "paused" ? "amber" : "neutral"}>
              {client.status}
            </Badge>
          )}
          <Badge tone="accent">{ROLE_LABEL[accessRole]}</Badge>
        </div>
        {client.tagline && (
          <p className="mt-0.5 text-[12.5px] text-muted">{client.tagline}</p>
        )}
      </div>
      {hasMultiple && (
        <Link
          href="/workspace/pick"
          className="inline-flex items-center gap-1 rounded-[8px] border border-border bg-surface-2 px-3 py-1.5 text-[12.5px] font-medium text-text hover:border-accent/40"
        >
          Switch client
          <ChevronDown className="h-3 w-3" />
        </Link>
      )}
    </header>
  );
}
