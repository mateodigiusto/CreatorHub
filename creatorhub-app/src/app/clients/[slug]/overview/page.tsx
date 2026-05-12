/**
 * Client Overview — the snapshot screen.
 *
 * Read-only summary: brand snapshot at the top + 6 callout cards linking to
 * the other tabs. The data behind brand-build / strategy / pipeline / etc.
 * lands in Phase 3+; for now the callouts link forward and the snapshot
 * shows what's already on the client row (name, slug, status, IG handle).
 */

import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  Compass,
  KanbanSquare,
  CalendarRange,
  BarChart3,
  Folder,
  ArrowUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireClientAccess } from "@/lib/auth/require-client-access";
import type { Client } from "@/lib/agency/types";

type Callout = {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status: "ready" | "coming";
};

const CALLOUTS: Callout[] = [
  {
    key: "brand-build",
    title: "Brand Build",
    description: "Long-form brand profile + AI transcript analyzer.",
    icon: Sparkles,
    status: "coming",
  },
  {
    key: "strategy",
    title: "Strategy",
    description: "Next-quarter pillars, target audience, content goals.",
    icon: Compass,
    status: "coming",
  },
  {
    key: "pipeline",
    title: "Pipeline",
    description: "Kanban: idea → script → film → edit → post.",
    icon: KanbanSquare,
    status: "coming",
  },
  {
    key: "calendar",
    title: "Calendar",
    description: "Month view of scheduled and posted content.",
    icon: CalendarRange,
    status: "coming",
  },
  {
    key: "metrics",
    title: "Metrics",
    description: "Views, top posts, format breakdown.",
    icon: BarChart3,
    status: "coming",
  },
  {
    key: "assets",
    title: "Assets",
    description: "Folder tree, raw clips, published files, SOPs.",
    icon: Folder,
    status: "coming",
  },
];

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { client } = await requireClientAccess(slug);

  return (
    <div className="grid gap-6">
      <Snapshot client={client} />

      <div>
        <h2 className="text-[14px] font-semibold tracking-[-0.005em] text-text mb-3">
          Workspace
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CALLOUTS.map((c) => (
            <CalloutCard key={c.key} slug={client.slug} callout={c} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Snapshot({ client }: { client: Client }) {
  return (
    <Card>
      <CardHeader
        title="Snapshot"
        description="What we know about this client so far."
      />
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
        <SnapshotRow label="Slug" value={<code className="font-mono text-[12px]">{client.slug}</code>} />
        <SnapshotRow label="Status" value={client.status} />
        <SnapshotRow
          label="Instagram"
          value={client.instagramHandle ? `@${client.instagramHandle.replace(/^@/, "")}` : "—"}
        />
        <SnapshotRow label="Tagline" value={client.tagline ?? "—"} />
        <SnapshotRow
          label="Created"
          value={new Date(client.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        />
        <SnapshotRow
          label="Last updated"
          value={new Date(client.updatedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        />
      </dl>
    </Card>
  );
}

function SnapshotRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border/60 last:border-b-0">
      <dt className="text-muted text-[12.5px]">{label}</dt>
      <dd className="text-text text-[13px] text-right truncate">{value}</dd>
    </div>
  );
}

function CalloutCard({ slug, callout }: { slug: string; callout: Callout }) {
  const Icon = callout.icon;
  const isReady = callout.status === "ready";

  const inner = (
    <Card lift={isReady} padded className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="w-9 h-9 rounded-[10px] bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
          <Icon className="w-4 h-4" />
        </div>
        {isReady ? (
          <ArrowUpRight className="w-4 h-4 text-muted" />
        ) : (
          <Badge tone="neutral">Coming soon</Badge>
        )}
      </div>
      <h3 className="text-[14px] font-semibold tracking-[-0.005em] text-text mt-4">
        {callout.title}
      </h3>
      <p className="text-[12.5px] text-muted mt-1 leading-snug">
        {callout.description}
      </p>
    </Card>
  );

  if (!isReady) {
    return <div className="opacity-70">{inner}</div>;
  }
  return (
    <Link href={`/clients/${slug}/${callout.key}`} className="block">
      {inner}
    </Link>
  );
}
