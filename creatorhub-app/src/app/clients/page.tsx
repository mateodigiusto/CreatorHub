"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import type { RelationshipSummary } from "@/lib/clients/types";

function statusTone(s: RelationshipSummary["status"]): {
  tone: "accent" | "green" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
} {
  switch (s) {
    case "active":
      return { tone: "green", icon: CheckCircle2, label: "Active" };
    case "pending":
      return { tone: "accent", icon: Clock, label: "Pending" };
    case "declined":
      return { tone: "neutral", icon: XCircle, label: "Declined" };
    case "ended":
      return { tone: "neutral", icon: XCircle, label: "Ended" };
    case "expired":
      return { tone: "neutral", icon: Clock, label: "Expired" };
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* Show the search box once the user has more than this many relationships
   total — below it the page is short enough to scan without filtering. */
const SEARCH_THRESHOLD = 5;

export default function ClientsPage() {
  const router = useRouter();
  const [relationships, setRelationships] = useState<
    RelationshipSummary[] | null
  >(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/clients", { credentials: "include" });
      if (!r.ok) {
        setRelationships([]);
        return;
      }
      const json = (await r.json()) as { relationships: RelationshipSummary[] };
      setRelationships(json.relationships);
    } catch {
      setRelationships([]);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  const groups = useMemo(() => {
    if (!relationships) return null;
    const q = query.trim().toLowerCase();
    const matches = (r: RelationshipSummary) => {
      if (!q) return true;
      const name = (r.counterpartyName ?? "").toLowerCase();
      const email = (r.counterpartyEmail ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    };
    const managing = relationships
      .filter((r) => r.perspective === "manager")
      .filter(matches);
    const workingWith = relationships
      .filter((r) => r.perspective === "creator")
      .filter(matches);
    return { managing, workingWith };
  }, [relationships, query]);

  const showSearch = (relationships?.length ?? 0) > SEARCH_THRESHOLD;

  if (relationships === null) {
    return (
      <>
        <PageHeader
          title="Clients"
          description="People you manage and people who manage you."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-[14px] bg-surface-2 border border-border animate-pulse"
            />
          ))}
        </div>
      </>
    );
  }

  if (relationships.length === 0) {
    return (
      <>
        <PageHeader
          title="Clients"
          description="People you manage and people who manage you."
          actions={
            <Link href="/clients/new">
              <Button>
                <Plus className="w-3.5 h-3.5" /> Invite a creator
              </Button>
            </Link>
          }
        />
        <EmptyState
          title="No client relationships yet."
          description="Invite a creator by email to start managing tasks, files, and conversations from one hub."
          showSampleDataCta={false}
          icon={<Users className="w-6 h-6" />}
          primaryAction={{
            label: "Invite a creator",
            onClick: () => router.push("/clients/new"),
          }}
        />
      </>
    );
  }

  const noResults =
    showSearch &&
    query.trim().length > 0 &&
    groups &&
    groups.managing.length === 0 &&
    groups.workingWith.length === 0;

  return (
    <>
      <PageHeader
        title="Clients"
        description="People you manage and people who manage you."
        actions={
          <Link href="/clients/new">
            <Button>
              <Plus className="w-3.5 h-3.5" /> Invite a creator
            </Button>
          </Link>
        }
      />

      {showSearch && (
        <div className="relative max-w-[420px] mb-4">
          <Search className="w-3.5 h-3.5 text-muted absolute left-[11px] top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full h-9 pl-9 pr-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      )}

      {noResults && (
        <div className="text-[13px] text-muted py-8 text-center">
          No relationships match &ldquo;{query.trim()}&rdquo;.
        </div>
      )}

      {groups && groups.managing.length > 0 && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text">
                Your clients
              </h3>
              <p className="text-[13px] text-muted mt-0.5">
                {groups.managing.length} creator
                {groups.managing.length === 1 ? "" : "s"} you manage
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.managing.map((r) => (
              <RelationshipTile key={r.id} relationship={r} />
            ))}
          </div>
        </Card>
      )}

      {groups && groups.workingWith.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text">
                Working with
              </h3>
              <p className="text-[13px] text-muted mt-0.5">
                {groups.workingWith.length} manager
                {groups.workingWith.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.workingWith.map((r) => (
              <RelationshipTile key={r.id} relationship={r} />
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function RelationshipTile({ relationship }: { relationship: RelationshipSummary }) {
  const s = statusTone(relationship.status);
  const Icon = s.icon;
  const name =
    relationship.counterpartyName ||
    relationship.counterpartyEmail ||
    "Unknown";
  const initials = name
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Link
      href={`/clients/${relationship.id}`}
      className="lift block rounded-[14px] border border-border bg-surface card-base overflow-hidden cursor-pointer"
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-accent-soft border border-accent-border grid place-items-center text-[13px] font-semibold text-accent shrink-0">
            {initials || <Users className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-text truncate">
              {name}
            </div>
            {relationship.counterpartyEmail &&
              relationship.counterpartyEmail !== name && (
                <div className="text-[11.5px] text-muted truncate">
                  {relationship.counterpartyEmail}
                </div>
              )}
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <Badge tone={s.tone}>
            <Icon className={cn("w-3 h-3", "inline-block mr-1")} />
            {s.label}
          </Badge>
          <span className="text-muted">
            {relationship.perspective === "manager" ? "Manager" : "Creator"} ·{" "}
            {timeAgo(relationship.createdAt)}
          </span>
        </div>
        <div className="pt-3 mt-3 border-t border-border flex items-center justify-end text-[12px] font-medium text-accent">
          Open hub <ArrowUpRight className="w-3 h-3 ml-1" />
        </div>
      </div>
    </Link>
  );
}
