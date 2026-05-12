/**
 * Per-client shell: PageHeader with the client's name + a 10-tab SubNav.
 *
 * In Phase 2 only Overview and Settings are "live"; the rest render as
 * disabled placeholders in the sub-nav until Phases 3-5 fill them in.
 *
 * Note for the merger: this layout sits at /clients/[slug] and is
 * incompatible with the legacy /clients/[id] route. The [id] tree (and
 * its API + components) gets removed before Phase 2 ships. See
 * docs/plans/PHASE_2_NOTES.md for the cleanup list.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, AtSign } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ClientSubNav } from "@/components/clients/ClientSubNav";
import { requireClientAccess } from "@/lib/auth/require-client-access";

const statusTone = {
  active: "green",
  paused: "amber",
  archived: "neutral",
} as const;

export default async function ClientLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: ReactNode;
}) {
  const { slug } = await params;
  const { client } = await requireClientAccess(slug);

  return (
    <div className="p-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-text mb-4"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        All clients
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {client.displayName}
            <Badge tone={statusTone[client.status]}>
              {client.status[0].toUpperCase() + client.status.slice(1)}
            </Badge>
          </span>
        }
        description={
          client.tagline ?? (
            <span className="text-muted">
              No tagline yet. Add one in <Link href={`/clients/${client.slug}/settings`} className="text-accent hover:underline">Settings</Link>.
            </span>
          )
        }
        actions={
          client.instagramHandle ? (
            <Badge tone="accent">
              <AtSign className="w-3 h-3" />
              {client.instagramHandle.replace(/^@/, "")}
            </Badge>
          ) : null
        }
      />

      <ClientSubNav slug={client.slug} />

      {children}
    </div>
  );
}
