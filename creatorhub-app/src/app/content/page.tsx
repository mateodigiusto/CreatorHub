"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Thumb } from "@/components/ui/Thumb";
import { Tabs } from "@/components/ui/Tabs";
import { Drawer } from "@/components/ui/Drawer";
import { useAppState } from "@/lib/store";
import { posts } from "@/lib/mock/data";
import { Post, ContentStatus } from "@/lib/mock/types";
import { Plus, Search, Filter, Wand2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { PlanContentDrawer } from "@/components/plan/PlanContentDrawer";

const statusOrder: ContentStatus[] = [
  "Idea",
  "Script",
  "Recording",
  "Editing",
  "Review",
  "Scheduled",
  "Published",
  "Analyzed",
];

const stageBorder: Record<ContentStatus, string> = {
  Idea: "rgba(96,165,250,0.55)",
  Script: "rgba(167,139,250,0.55)",
  Recording: "rgba(251,146,60,0.55)",
  Editing: "rgba(52,211,153,0.55)",
  Review: "rgba(250,204,21,0.55)",
  Scheduled: "rgba(37,99,235,0.55)",
  Published: "rgba(74,222,128,0.55)",
  Analyzed: "rgba(34,211,238,0.55)",
};

const statusTone: Record<ContentStatus, Parameters<typeof Badge>[0]["tone"]> = {
  Idea: "neutral",
  Script: "neutral",
  Recording: "blue",
  Editing: "amber",
  Review: "amber",
  Scheduled: "teal",
  Published: "green",
  Analyzed: "navy",
};

export default function ContentPage() {
  const { connected, extraPosts } = useAppState();
  const [view, setView] = useState<"library" | "pipeline">("library");
  const [selected, setSelected] = useState<Post | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  const allPosts = [...extraPosts, ...posts];

  if (!connected) {
    return (
      <>
        <PageHeader title="Content" description="Your production system." />
        <EmptyState
          title="Start building your content system."
          description="Create your first content item or import published posts from Instagram."
          primaryAction={{ label: "New content" }}
          secondaryAction={{ label: "Connect Instagram" }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Content"
        description="Manage every post from idea to analyzed."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => setPlanOpen(true)}
            >
              <Wand2 className="w-4 h-4" /> Story Sequence
            </Button>
            <Button variant="outline" size="md">
              <Filter className="w-4 h-4" /> Filters
            </Button>
            <Button size="md" onClick={() => setPlanOpen(true)}>
              <Plus className="w-4 h-4" /> New content
            </Button>
          </>
        }
      />

      <div className="flex items-center justify-between mb-5">
        <Tabs
          value={view}
          onChange={(v) => setView(v as typeof view)}
          options={[
            { value: "library", label: "Library" },
            { value: "pipeline", label: "Pipeline" },
          ]}
        />
        <div className="relative w-[280px]">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search content…"
            className="w-full h-9 pl-9 pr-3 rounded-[10px] bg-surface border border-border text-[13px] focus:outline-none focus:border-teal/40 focus:ring-2 focus:ring-teal/20"
          />
        </div>
      </div>

      {view === "library" ? (
        <Card padded={false}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11.5px] uppercase tracking-wider text-muted">
                <th className="text-left font-medium px-5 py-3">Title</th>
                <th className="text-left font-medium py-3">Type</th>
                <th className="text-left font-medium py-3">Status</th>
                <th className="text-right font-medium py-3">Reach</th>
                <th className="text-right font-medium py-3">ER</th>
                <th className="text-right font-medium px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {allPosts.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="border-t border-border hover:bg-teal/[0.04] transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Thumb gradient={p.thumbnail} size="sm" />
                      <span className="text-navy font-medium">{p.title}</span>
                      {p.engagementRate > 6 && p.status === "Published" && (
                        <Badge tone="teal">Top performer</Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge tone="neutral">{p.type}</Badge>
                  </td>
                  <td className="py-3">
                    <Badge tone={statusTone[p.status]}>{p.status}</Badge>
                  </td>
                  <td className="text-right tabular-nums py-3">
                    {p.status === "Published" || p.status === "Analyzed"
                      ? `${(p.reach / 1000).toFixed(1)}K`
                      : "—"}
                  </td>
                  <td className="text-right tabular-nums py-3 text-teal font-medium">
                    {p.status === "Published" || p.status === "Analyzed"
                      ? `${p.engagementRate}%`
                      : "—"}
                  </td>
                  <td className="text-right tabular-nums px-5 py-3 text-muted">
                    {p.publishedAt
                      ? new Date(p.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : p.scheduledAt
                      ? new Date(p.scheduledAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-3 overflow-x-auto pb-3">
          {statusOrder.slice(0, 8).map((status) => {
            const items = allPosts.filter((p) => p.status === status);
            return (
              <div
                key={status}
                className="bg-surface-2/60 border border-border rounded-[12px] p-3 min-w-[230px] hover:bg-surface-2 hover:border-accent/20 transition-colors"
                style={{ borderTop: `2px solid ${stageBorder[status]}` }}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone[status]}>{status}</Badge>
                  </div>
                  <span className="text-[12px] text-muted font-medium tabular-nums">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="lift w-full text-left bg-surface border border-border rounded-[10px] p-3 card-base"
                    >
                      <div className="flex items-start gap-2">
                        <Thumb gradient={p.thumbnail} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] text-navy font-medium leading-snug">
                            {p.title}
                          </div>
                          <div className="text-[11px] text-muted mt-1">
                            {p.type}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {items.length === 0 && (
                    <div className="text-[12px] text-muted px-2 py-3">No items</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Content detail"
      >
        {selected && (
          <div>
            <Thumb gradient={selected.thumbnail} size="lg" className="mb-4" />
            <div className="flex items-center gap-2 mb-3">
              <Badge tone={statusTone[selected.status]}>{selected.status}</Badge>
              <Badge tone="neutral">{selected.type}</Badge>
            </div>
            <h2 className="text-[18px] font-semibold tracking-tight text-navy">
              {selected.title}
            </h2>
            <p className="text-[13.5px] text-muted mt-2 leading-relaxed">
              {selected.caption}
            </p>

            {(selected.status === "Published" ||
              selected.status === "Analyzed") && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Stat label="Reach" value={`${(selected.reach / 1000).toFixed(1)}K`} />
                <Stat label="Engagement" value={`${selected.engagementRate}%`} />
                <Stat label="Likes" value={selected.likes.toLocaleString()} />
                <Stat label="Saves" value={selected.saves.toString()} />
                <Stat label="Comments" value={selected.comments.toString()} />
                <Stat label="Shares" value={selected.shares.toString()} />
              </div>
            )}

            <div className="mt-6 flex items-center gap-2">
              <Button>Open in editor</Button>
              <Button variant="outline">Duplicate</Button>
            </div>
          </div>
        )}
      </Drawer>

      <PlanContentDrawer
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        entry="content"
        initialTab="story"
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("border border-border rounded-[10px] p-3")}>
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className="text-[18px] font-semibold tracking-tight text-navy mt-0.5">
        {value}
      </div>
    </div>
  );
}
