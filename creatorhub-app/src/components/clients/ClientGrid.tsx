"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowUpRight, AtSign, Eye, UserPlus } from "lucide-react";
import type { Client } from "@/lib/agency/types";
import { InviteClientDialog } from "./InviteClientDialog";

const statusTone: Record<Client["status"], "green" | "amber" | "neutral"> = {
  active: "green",
  paused: "amber",
  archived: "neutral",
};

export function ClientGrid({
  clients,
  canPreview = false,
}: {
  clients: Client[];
  canPreview?: boolean;
}) {
  const [inviting, setInviting] = useState<Client | null>(null);

  if (clients.length === 0) return null;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => (
          <Card key={c.id} lift padded className="h-full relative">
            {/* Whole-card link to the client overview. */}
            <Link
              href={`/clients/${c.slug}/overview`}
              className="absolute inset-0 rounded-[14px]"
              aria-label={`Open ${c.displayName}`}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text truncate">
                  {c.displayName}
                </h3>
                {c.tagline && (
                  <p className="text-[13px] text-muted mt-1 line-clamp-2">
                    {c.tagline}
                  </p>
                )}
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted shrink-0 mt-0.5" />
            </div>

            <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone={statusTone[c.status]}>
                  {c.status[0].toUpperCase() + c.status.slice(1)}
                </Badge>
                {c.instagramHandle && (
                  <Badge tone="accent">
                    <AtSign className="w-3 h-3" />
                    {c.instagramHandle.replace(/^@/, "")}
                  </Badge>
                )}
              </div>
              {/* Above the card-link overlay so they stay clickable. */}
              <div className="relative z-[1] flex items-center gap-1.5">
                {canPreview && (
                  <form method="POST" action={`/api/clients/${c.slug}/preview`}>
                    <button
                      type="submit"
                      title="View as client"
                      className="inline-flex items-center gap-1 h-7 px-2 rounded-[8px] border border-border bg-surface-2 text-[11.5px] font-medium text-muted hover:text-text hover:border-accent-border transition-colors cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </form>
                )}
                <button
                  type="button"
                  onClick={() => setInviting(c)}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-[8px] border border-border bg-surface-2 text-[11.5px] font-medium text-muted hover:text-text hover:border-accent-border transition-colors"
                >
                  <UserPlus className="w-3 h-3" />
                  Invite
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <InviteClientDialog
        open={inviting !== null}
        onClose={() => setInviting(null)}
        slug={inviting?.slug ?? ""}
        clientName={inviting?.displayName ?? ""}
      />
    </>
  );
}
