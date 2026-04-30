"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Thumb } from "@/components/ui/Thumb";
import { Tabs } from "@/components/ui/Tabs";
import { Plus, Filter, Wand2 } from "lucide-react";
import { useAppState } from "@/lib/store";
import { posts } from "@/lib/mock/data";
import { ContentStatus, Post } from "@/lib/mock/types";
import { PlanContentDrawer } from "@/components/plan/PlanContentDrawer";

const STATUS_TONE: Record<ContentStatus, "neutral" | "accent" | "amber" | "green"> = {
  Idea: "neutral",
  Script: "neutral",
  Recording: "amber",
  Editing: "amber",
  Review: "amber",
  Scheduled: "accent",
  Published: "green",
  Analyzed: "neutral",
};

const PIPELINE_COLS: ContentStatus[] = [
  "Idea",
  "Script",
  "Editing",
  "Scheduled",
  "Published",
];

export default function ContentPage() {
  const { connected, extraPosts } = useAppState();
  const [view, setView] = useState<"library" | "pipeline">("library");
  const [filter, setFilter] = useState<"all" | ContentStatus>("all");
  const [planOpen, setPlanOpen] = useState(false);

  const allPosts = [...extraPosts, ...posts];

  if (!connected) {
    return (
      <>
        <PageHeader title="Content" description="Your production system." />
        <EmptyState
          title="Start building your content system."
          description="Create your first content item or import published posts from a connected platform."
          primaryAction={{ label: "New content" }}
        />
      </>
    );
  }

  const filtered = allPosts.filter(
    (p) => filter === "all" || p.status === filter
  );

  return (
    <>
      <PageHeader
        title="Content"
        description="Every piece of content, from idea to published."
        actions={
          <>
            <Tabs
              value={view}
              onChange={(v) => setView(v as typeof view)}
              options={[
                { value: "library", label: "Library" },
                { value: "pipeline", label: "Pipeline" },
              ]}
            />
            <Button variant="outline" size="md" onClick={() => setPlanOpen(true)}>
              <Wand2 className="w-3.5 h-3.5" /> Sequence Studio
            </Button>
            <Button size="md" onClick={() => setPlanOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> New content
            </Button>
          </>
        }
      />

      {view === "library" ? (
        <>
          <div className="flex items-center justify-between mb-3.5">
            <Tabs
              value={filter}
              onChange={(v) => setFilter(v as typeof filter)}
              options={[
                { value: "all", label: "All" },
                { value: "Published", label: "Published" },
                { value: "Scheduled", label: "Scheduled" },
                { value: "Editing", label: "Editing" },
                { value: "Idea", label: "Idea" },
              ]}
            />
            <Button variant="outline" size="sm">
              <Filter className="w-3 h-3" /> Filters
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const date = p.publishedAt
                ? new Date(p.publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : p.scheduledAt
                ? new Date(p.scheduledAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "—";
              return (
                <Card key={p.id} padded={false} lift>
                  <Thumb
                    gradient={p.thumbnail}
                    size="lg"
                    label={p.platform}
                    style={{
                      borderRadius: "14px 14px 0 0",
                      aspectRatio: "16/10",
                    }}
                  />
                  <div className="p-4">
                    <h4 className="text-[14px] font-semibold tracking-[-0.005em] text-text mb-1.5 line-clamp-2 min-h-[2.6em]">
                      {p.title}
                    </h4>
                    <div className="flex items-center justify-between">
                      <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                      <span className="text-[12px] text-muted tabular-nums">
                        {date}
                        {p.reach > 0 && ` · ${(p.reach / 1000).toFixed(1)}K`}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <Pipeline posts={allPosts} />
      )}

      <PlanContentDrawer
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        entry="content"
        initialTab="story"
      />
    </>
  );
}

function Pipeline({ posts }: { posts: Post[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {PIPELINE_COLS.map((col) => {
        const rows = posts.filter((p) => p.status === col);
        return (
          <div
            key={col}
            className="bg-surface-2 border border-border rounded-[12px] p-2.5"
          >
            <div className="flex items-center justify-between px-1.5 pb-2.5 pt-1">
              <span className="text-[12px] font-semibold text-text">{col}</span>
              <span className="text-[11px] text-muted tabular-nums">
                {rows.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {rows.map((p) => (
                <div
                  key={p.id}
                  className="bg-surface border border-border rounded-[10px] p-2.5 cursor-pointer hover:border-accent/30 transition-colors"
                >
                  <Thumb
                    gradient={p.thumbnail}
                    size="lg"
                    label={p.platform}
                    style={{
                      aspectRatio: "16/10",
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  />
                  <div className="text-[12.5px] font-medium text-text leading-[1.35] line-clamp-2">
                    {p.title}
                  </div>
                </div>
              ))}
              <button className="h-8 px-2.5 bg-transparent border border-dashed border-border rounded-[8px] text-muted text-[12px] inline-flex items-center justify-center gap-1.5 hover:border-accent/40 hover:text-accent transition-colors">
                <Plus className="w-2.5 h-2.5" /> Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

