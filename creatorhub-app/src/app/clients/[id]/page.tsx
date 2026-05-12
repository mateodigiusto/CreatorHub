"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  CheckSquare,
  Flame,
  Folder,
  Link2,
  MessagesSquare,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { useAppState } from "@/lib/store";
import { TasksPanel } from "@/components/clients/TasksPanel";
import { StreakPanel } from "@/components/clients/StreakPanel";
import { DocsPanel } from "@/components/clients/DocsPanel";
import { LinksPanel } from "@/components/clients/LinksPanel";
import { MessagesPanel } from "@/components/clients/MessagesPanel";
import { ReportPanel } from "@/components/clients/ReportPanel";
import { RetainerCard } from "@/components/clients/RetainerCard";
import type { RelationshipDetail } from "@/lib/clients/types";

type Tab = "tasks" | "streak" | "docs" | "links" | "messages" | "report";

const TABS: { value: Tab; label: string; icon: React.ComponentType<{ className?: string }>; managerOnly?: boolean }[] = [
  { value: "tasks", label: "Tasks", icon: CheckSquare },
  { value: "streak", label: "Streak", icon: Flame },
  { value: "docs", label: "Docs", icon: Folder },
  { value: "links", label: "Links", icon: Link2 },
  { value: "messages", label: "Messages", icon: MessagesSquare },
  { value: "report", label: "Report", icon: BarChart3, managerOnly: true },
];

export default function RelationshipHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { showToast } = useAppState();
  const [id, setId] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<RelationshipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("tasks");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const p = await params;
      setId(p.id);
    })();
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await fetch(`/api/clients/${id}`, { credentials: "include" });
      if (!r.ok) {
        setLoading(false);
        return;
      }
      const json = (await r.json()) as { relationship: RelationshipDetail };
      setRelationship(json.relationship);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  async function transition(status: "active" | "declined" | "ended") {
    if (!id || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!r.ok) {
        showToast("Couldn't update. Try again.");
        setBusy(false);
        return;
      }
      if (status === "ended" || status === "declined") {
        showToast(status === "ended" ? "Relationship ended" : "Invite declined");
        router.replace("/clients");
        return;
      }
      showToast("Invite accepted");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Loading…" description="" />
        <div className="h-64 rounded-[14px] bg-surface-2 border border-border animate-pulse" />
      </>
    );
  }

  if (!relationship) {
    return (
      <>
        <PageHeader
          title="Not found"
          description="This relationship doesn't exist or you don't have access."
        />
        <Link href="/clients">
          <Button variant="ghost">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to clients
          </Button>
        </Link>
      </>
    );
  }

  const isManager = relationship.perspective === "manager";
  const counterparty =
    relationship.counterpartyName ||
    relationship.counterpartyEmail ||
    "Unknown";
  const headerLabel = isManager
    ? `Client: ${counterparty}`
    : `Working with ${counterparty}`;
  const status = relationship.status;
  const isPendingForCreator = !isManager && status === "pending";
  const isActive = status === "active";

  return (
    <>
      <PageHeader
        title={headerLabel}
        description={
          isManager
            ? "Tasks, streaks, files, links, and messages with this creator."
            : "Tasks assigned to you, your streak, files shared, and messages."
        }
        actions={
          <Link
            href="/clients"
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted hover:text-text px-2 py-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All clients
          </Link>
        }
      />

      <StatusBanner
        status={status}
        isManager={isManager}
        isPendingForCreator={isPendingForCreator}
        busy={busy}
        onTransition={transition}
      />

      {isActive && isManager && (
        <RetainerCard
          relationship={relationship}
          onUpdated={(patch) =>
            setRelationship((prev) => (prev ? { ...prev, ...patch } : prev))
          }
          onError={(msg) => showToast(msg)}
        />
      )}

      {isActive && (
        <>
          <div className="mb-4">
            <Tabs<Tab>
              value={tab}
              onChange={setTab}
              options={TABS.filter(
                (t) => !t.managerOnly || isManager,
              ).map((t) => ({ value: t.value, label: t.label }))}
            />
          </div>
          <Card>
            {tab === "tasks" ? (
              <TasksPanel
                relationshipId={relationship.id}
                perspective={relationship.perspective}
              />
            ) : tab === "streak" ? (
              <StreakPanel relationshipId={relationship.id} />
            ) : tab === "docs" ? (
              <DocsPanel relationshipId={relationship.id} />
            ) : tab === "links" ? (
              <LinksPanel relationshipId={relationship.id} />
            ) : tab === "messages" ? (
              <MessagesPanel
                relationshipId={relationship.id}
                selfUserId={
                  relationship.perspective === "manager"
                    ? relationship.managerId
                    : (relationship.creatorId ?? "")
                }
              />
            ) : tab === "report" ? (
              <ReportPanel relationshipId={relationship.id} />
            ) : (
              <PanelStub tab={tab} />
            )}
          </Card>
        </>
      )}
    </>
  );
}

function StatusBanner({
  status,
  isManager,
  isPendingForCreator,
  busy,
  onTransition,
}: {
  status: RelationshipDetail["status"];
  isManager: boolean;
  isPendingForCreator: boolean;
  busy: boolean;
  onTransition: (s: "active" | "declined" | "ended") => void;
}) {
  if (status === "active") {
    return (
      <div className="mb-4 px-3 py-2 rounded-[10px] bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-[12.5px] text-green-700 dark:text-green-300 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        <span>Active relationship.</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm("End this relationship? History stays read-only.")) {
              onTransition("ended");
            }
          }}
          className="ml-auto text-[11.5px] font-medium text-muted hover:text-red-600 cursor-pointer"
        >
          End relationship
        </button>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="mb-4 px-3 py-2.5 rounded-[10px] bg-accent-soft border border-accent-border text-[13px] text-text flex items-center gap-3">
        <Clock className="w-4 h-4 text-accent" />
        <div className="flex-1">
          <span className="font-medium">Pending invite.</span>{" "}
          <span className="text-muted">
            {isManager
              ? "Waiting for them to accept."
              : "You haven't accepted yet."}
          </span>
        </div>
        {isPendingForCreator ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onTransition("declined")}
            >
              Decline
            </Button>
            <Button size="sm" disabled={busy} onClick={() => onTransition("active")}>
              Accept
            </Button>
          </div>
        ) : isManager ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Cancel this pending invite?")) {
                onTransition("ended");
              }
            }}
          >
            Cancel invite
          </Button>
        ) : null}
      </div>
    );
  }
  if (status === "ended" || status === "declined" || status === "expired") {
    return (
      <div className="mb-4 px-3 py-2 rounded-[10px] bg-surface-2 border border-border text-[12.5px] text-muted flex items-center gap-2">
        <XCircle className="w-4 h-4" />
        <span className="capitalize">{status}.</span>
        <span className="text-muted/80">History is read-only.</span>
      </div>
    );
  }
  return null;
}

function PanelStub({ tab }: { tab: Tab }) {
  const Icon = TABS.find((t) => t.value === tab)?.icon ?? Users;
  const labels: Record<Tab, { title: string; description: string }> = {
    tasks: {
      title: "Tasks coming next",
      description:
        "Assign one-off and daily tasks. Mark them complete and leave notes.",
    },
    streak: {
      title: "Streak coming next",
      description:
        "Daily streak tracker. Complete every assigned daily task to keep your streak alive.",
    },
    docs: {
      title: "Docs coming next",
      description:
        "Share files between manager and creator without searching DMs.",
    },
    links: {
      title: "Links coming next",
      description:
        "Save Drive, Dropbox, and other URLs in one place.",
    },
    messages: {
      title: "Messages coming next",
      description:
        "Direct messaging tied to this relationship — no more cross-platform context loss.",
    },
    report: {
      title: "Report",
      description:
        "Monthly recap of this client's scripts, sequences, posts, and tasks.",
    },
  };
  const l = labels[tab];
  return (
    <EmptyState
      title={l.title}
      description={l.description}
      showSampleDataCta={false}
      icon={<Icon className="w-6 h-6" />}
    />
  );
}
