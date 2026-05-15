"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, X, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/cn";
import type { Platform } from "@/lib/onboarding/types";

type TargetStatus = "pitched" | "responded" | "client" | "pass";
type StatusFilter = TargetStatus | "all";

type Target = {
  id: string;
  user_id: string;
  creator_id: string;
  status: TargetStatus;
  notes: string | null;
  added_at: string;
  last_status_change_at: string;
  creator: {
    id: string;
    handle: string;
    display_name: string | null;
    niche: string;
    primary_platform: Platform;
    bio: string | null;
  } | null;
};

const STATUS_LABELS: Record<TargetStatus, string> = {
  pitched: "Pitched",
  responded: "Responded",
  client: "Client",
  pass: "Pass",
};
const STATUS_TONE: Record<TargetStatus, "accent" | "green" | "neutral"> = {
  pitched: "accent",
  responded: "accent",
  client: "green",
  pass: "neutral",
};

const STATUS_OPTIONS: TargetStatus[] = ["pitched", "responded", "client", "pass"];

export default function OutreachPage() {
  const router = useRouter();
  const { showToast } = useAppState();
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [tab, setTab] = useState<StatusFilter>("pitched");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/targets", { credentials: "include" });
      if (!res.ok) {
        setTargets([]);
        return;
      }
      const json = (await res.json()) as { targets: Target[] };
      setTargets(json.targets);
    } catch {
      setTargets([]);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      pitched: 0, responded: 0, client: 0, pass: 0, all: 0,
    };
    if (!targets) return c;
    for (const t of targets) {
      c[t.status]++;
      c.all++;
    }
    return c;
  }, [targets]);

  const filtered = useMemo(() => {
    if (!targets) return null;
    if (tab === "all") return targets;
    return targets.filter((t) => t.status === tab);
  }, [targets, tab]);

  async function updateStatus(id: string, status: TargetStatus) {
    if (updatingId) return;
    setUpdatingId(id);
    /* Optimistic. */
    setTargets((prev) =>
      prev ? prev.map((t) => (t.id === id ? { ...t, status } : t)) : prev,
    );
    try {
      const res = await fetch(`/api/targets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("non_ok");
      showToast(`Marked as ${STATUS_LABELS[status].toLowerCase()}`);
    } catch {
      showToast("Couldn't update. Reloading.");
      void load();
    } finally {
      setUpdatingId(null);
    }
  }

  async function remove(id: string) {
    if (updatingId) return;
    if (!confirm("Remove this creator from your target list?")) return;
    setUpdatingId(id);
    setTargets((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
    try {
      const res = await fetch(`/api/targets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("non_ok");
      showToast("Removed from target list");
    } catch {
      showToast("Couldn't remove. Reloading.");
      void load();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Outreach"
        description="Your target list across niches. Move creators through pitched → responded → client as you work them."
        actions={
          <Button onClick={() => router.push("/creators")}>
            <Send className="w-3.5 h-3.5" /> Browse directory
          </Button>
        }
      />

      <div className="mb-4">
        <Tabs<StatusFilter>
          value={tab}
          onChange={setTab}
          options={[
            { value: "pitched",   label: `Pitched${counts.pitched   > 0 ? ` · ${counts.pitched}`   : ""}` },
            { value: "responded", label: `Responded${counts.responded > 0 ? ` · ${counts.responded}` : ""}` },
            { value: "client",    label: `Client${counts.client     > 0 ? ` · ${counts.client}`    : ""}` },
            { value: "pass",      label: `Pass${counts.pass         > 0 ? ` · ${counts.pass}`      : ""}` },
            { value: "all",       label: `All${counts.all           > 0 ? ` · ${counts.all}`       : ""}` },
          ]}
        />
      </div>

      {targets === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[80px] rounded-[14px] bg-surface-2 border border-border animate-pulse"
            />
          ))}
        </div>
      ) : targets.length === 0 ? (
        <EmptyState
          title="No targets yet."
          description="Browse the creator directory and save someone you'd like to pitch as an editor."
          primaryAction={{
            label: "Browse directory",
            onClick: () => router.push("/creators"),
          }}
        />
      ) : filtered && filtered.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <div className="text-[13px] text-text font-medium">
              No targets in {STATUS_LABELS[tab as TargetStatus] ?? "this list"}.
            </div>
            <div className="text-[12px] text-muted mt-1">
              Switch tabs to see other statuses.
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered!.map((t) => (
            <Card key={t.id}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-[14px] font-semibold text-text">
                      {t.creator?.display_name ?? t.creator?.handle ?? "—"}
                    </div>
                    <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                    {t.creator?.niche && (
                      <Badge tone="neutral">{t.creator.niche}</Badge>
                    )}
                  </div>
                  <div className="text-[12px] text-muted mt-1 truncate">
                    {t.creator?.handle} · saved {timeAgo(t.added_at)}
                  </div>
                  {t.creator?.bio && (
                    <p className="text-[12.5px] text-muted mt-2 leading-relaxed line-clamp-2">
                      {t.creator.bio}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status changer — 4 small chips */}
                  <div className="hidden sm:flex items-center gap-1">
                    {STATUS_OPTIONS.map((s) => {
                      const active = t.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => updateStatus(t.id, s)}
                          disabled={updatingId === t.id}
                          className={cn(
                            "px-2 py-1 rounded-md border text-[11.5px] cursor-pointer transition-colors",
                            active
                              ? "border-accent/40 bg-accent-soft text-accent font-medium"
                              : "border-border text-muted hover:border-accent/30 hover:text-text",
                          )}
                        >
                          {active && <Check className="w-3 h-3 inline mr-0.5" />}
                          {STATUS_LABELS[s]}
                        </button>
                      );
                    })}
                  </div>
                  {/* Mobile: select dropdown */}
                  <select
                    value={t.status}
                    onChange={(e) => updateStatus(t.id, e.target.value as TargetStatus)}
                    disabled={updatingId === t.id}
                    className="sm:hidden h-8 px-2 rounded-md bg-surface border border-border text-[12px] text-text cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => remove(t.id)}
                    disabled={updatingId === t.id}
                    className="text-muted hover:text-red-600 cursor-pointer p-1.5"
                    aria-label="Remove from list"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
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
