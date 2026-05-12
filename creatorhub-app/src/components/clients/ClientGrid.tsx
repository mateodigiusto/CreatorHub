"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowUpRight, AtSign } from "lucide-react";
import type { Client } from "@/lib/agency/types";

const statusTone: Record<Client["status"], "green" | "amber" | "neutral"> = {
  active: "green",
  paused: "amber",
  archived: "neutral",
};

export function ClientGrid({ clients }: { clients: Client[] }) {
  if (clients.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((c) => (
        <Link key={c.id} href={`/clients/${c.slug}/overview`} className="block">
          <Card lift padded className="h-full">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text truncate">
                  {c.displayName}
                </h3>
                {c.tagline && (
                  <p className="text-[13px] text-muted mt-1 line-clamp-2">{c.tagline}</p>
                )}
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted shrink-0 mt-0.5" />
            </div>

            <div className="flex items-center gap-2 mt-4 flex-wrap">
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
          </Card>
        </Link>
      ))}
    </div>
  );
}
