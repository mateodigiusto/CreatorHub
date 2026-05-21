"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Lightbulb,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { useAppState } from "@/lib/store";
import { useClientQuery } from "@/lib/clients/use-client-query";
import { cn } from "@/lib/cn";

type IdeaRow = {
  id: string;
  hook: string;
  angle: string | null;
  sourceAnalysisId: string | null;
  sourceUrl: string | null;
  estimatedReach: string | null;
  score: number | null;
  saved: boolean;
  used: boolean;
  createdAt: string;
  updatedAt: string;
};

type TabKey = "all" | "saved" | "used";

export default function IdeasPage() {
  const { showToast } = useAppState();
  const clientQ = useClientQuery();
  const [ideas, setIdeas] = useState<IdeaRow[] | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/ideas${clientQ.q}`, { credentials: "include" });
      if (!r.ok) {
        setIdeas([]);
        return;
      }
      const json = (await r.json()) as { ideas: IdeaRow[] };
      setIdeas(json.ideas);
    } catch {
      setIdeas([]);
    }
  }, [clientQ.q]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- reload when active client changes */
    void load();
  }, [load]);

  const counts = useMemo(() => {
    if (!ideas) return { all: 0, saved: 0, used: 0 };
    return {
      all: ideas.length,
      saved: ideas.filter((i) => i.saved).length,
      used: ideas.filter((i) => i.used).length,
    };
  }, [ideas]);

  const filtered = useMemo(() => {
    if (!ideas) return null;
    const q = query.trim().toLowerCase();
    return ideas
      .filter((i) => {
        if (tab === "saved" && !i.saved) return false;
        if (tab === "used" && !i.used) return false;
        return true;
      })
      .filter((i) => {
        if (!q) return true;
        return (
          i.hook.toLowerCase().includes(q) ||
          (i.angle ?? "").toLowerCase().includes(q)
        );
      });
  }, [ideas, tab, query]);

  async function toggleSaved(idea: IdeaRow) {
    if (busyId) return;
    setBusyId(idea.id);
    /* Optimistic flip. */
    setIdeas((prev) =>
      prev ? prev.map((i) => (i.id === idea.id ? { ...i, saved: !i.saved } : i)) : prev,
    );
    try {
      const r = await fetch(`/api/ideas/${idea.id}${clientQ.q}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ saved: !idea.saved }),
      });
      if (!r.ok) throw new Error("non_ok");
    } catch {
      /* Rollback. */
      setIdeas((prev) =>
        prev ? prev.map((i) => (i.id === idea.id ? { ...i, saved: idea.saved } : i)) : prev,
      );
      showToast("Couldn't update. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleUsed(idea: IdeaRow) {
    if (busyId) return;
    setBusyId(idea.id);
    setIdeas((prev) =>
      prev ? prev.map((i) => (i.id === idea.id ? { ...i, used: !i.used } : i)) : prev,
    );
    try {
      const r = await fetch(`/api/ideas/${idea.id}${clientQ.q}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ used: !idea.used }),
      });
      if (!r.ok) throw new Error("non_ok");
    } catch {
      setIdeas((prev) =>
        prev ? prev.map((i) => (i.id === idea.id ? { ...i, used: idea.used } : i)) : prev,
      );
      showToast("Couldn't update. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(idea: IdeaRow) {
    if (busyId) return;
    if (!confirm("Delete this idea? This can't be undone.")) return;
    setBusyId(idea.id);
    /* Capture the pre-delete list inside the updater so a rollback
       restores whatever was on screen at delete time (not a stale
       render-closure snapshot). */
    let before: IdeaRow[] | null = null;
    setIdeas((prev) => {
      before = prev;
      return prev ? prev.filter((i) => i.id !== idea.id) : prev;
    });
    try {
      const r = await fetch(`/api/ideas/${idea.id}${clientQ.q}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) throw new Error("non_ok");
      showToast("Idea deleted.");
    } catch {
      setIdeas(before);
      showToast("Couldn't delete. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Ideas"
        description="Hooks you've saved from breakdowns or written by hand. Mark them used as they ship."
      />

      {ideas === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[140px] rounded-[14px] bg-surface-2 border border-border animate-pulse"
            />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="w-4 h-4" />}
          title="No ideas in the bank yet."
          description="Save a hook from any breakdown in Content DNA — the &ldquo;Add to Idea Bank&rdquo; button on the hook card lands them here."
          primaryAction={{ label: "Open Content DNA", href: "/content-dna" }}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <Tabs<TabKey>
              value={tab}
              onChange={setTab}
              options={[
                { value: "all", label: `All${counts.all > 0 ? ` · ${counts.all}` : ""}` },
                { value: "saved", label: `Saved${counts.saved > 0 ? ` · ${counts.saved}` : ""}` },
                { value: "used", label: `Used${counts.used > 0 ? ` · ${counts.used}` : ""}` },
              ]}
            />
            <div className="relative w-full sm:w-[240px]">
              <Search className="w-3.5 h-3.5 text-muted absolute left-[11px] top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hooks…"
                className="w-full h-9 pl-9 pr-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {filtered && filtered.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <div className="text-[13.5px] text-text font-medium">
                  No ideas match this filter.
                </div>
                <div className="text-[12px] text-muted mt-1">
                  Switch tabs or clear the search.
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered?.map((idea) => (
                <IdeaTile
                  key={idea.id}
                  idea={idea}
                  busy={busyId === idea.id}
                  onToggleSaved={() => toggleSaved(idea)}
                  onToggleUsed={() => toggleUsed(idea)}
                  onDelete={() => remove(idea)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function IdeaTile({
  idea,
  busy,
  onToggleSaved,
  onToggleUsed,
  onDelete,
}: {
  idea: IdeaRow;
  busy: boolean;
  onToggleSaved: () => void;
  onToggleUsed: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={cn("relative", busy && "opacity-60 pointer-events-none")}>
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            {idea.saved && (
              <Badge tone="accent">
                <BookmarkCheck className="w-3 h-3 inline mr-1" />
                Saved
              </Badge>
            )}
            {idea.used && (
              <Badge tone="green">
                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                Used
              </Badge>
            )}
            {idea.score !== null && (
              <Badge tone="neutral">{idea.score.toFixed(1)} / 10</Badge>
            )}
          </div>
          <div className="text-[14px] font-semibold tracking-[-0.005em] text-text leading-snug">
            {idea.hook}
          </div>
          {idea.angle && (
            <div className="text-[12.5px] text-muted mt-2 leading-relaxed line-clamp-3">
              {idea.angle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
        <div className="flex items-center gap-2 text-[11.5px] text-muted">
          <span>{timeAgo(idea.createdAt)}</span>
          {idea.sourceAnalysisId && (
            <Link
              href={`/content-dna/${idea.sourceAnalysisId}`}
              className="inline-flex items-center gap-1 text-accent hover:text-accent-2 font-medium cursor-pointer"
            >
              Source <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton
            label={idea.saved ? "Unsave" : "Save"}
            active={idea.saved}
            onClick={onToggleSaved}
          >
            <Bookmark className={cn("w-3.5 h-3.5", idea.saved && "fill-current")} />
          </IconButton>
          <IconButton
            label={idea.used ? "Mark unused" : "Mark used"}
            active={idea.used}
            onClick={onToggleUsed}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton label="Delete" onClick={onDelete} danger>
            <Trash2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>
    </Card>
  );
}

function IconButton({
  label,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "w-7 h-7 grid place-items-center rounded-md cursor-pointer transition-colors",
        active
          ? "text-accent bg-accent-soft"
          : danger
            ? "text-muted hover:text-red-600 hover:bg-red-500/5"
            : "text-muted hover:text-text hover:bg-surface-2",
      )}
    >
      {children}
    </button>
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
