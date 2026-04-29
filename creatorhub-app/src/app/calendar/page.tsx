"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Thumb } from "@/components/ui/Thumb";
import { useAppState } from "@/lib/store";
import { getWeek, posts } from "@/lib/mock/data";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { PlanContentDrawer } from "@/components/plan/PlanContentDrawer";

export default function CalendarPage() {
  const { connected, extraPosts } = useAppState();
  const [drawer, setDrawer] = useState<{ open: boolean; date?: Date }>({
    open: false,
  });

  if (!connected) {
    return (
      <>
        <PageHeader
          title="Calendar"
          description="Your publishing system."
        />
        <EmptyState
          title="Your calendar is empty."
          description="Plan your first week of content and keep your publishing consistent."
          primaryAction={{ label: "Plan first week" }}
        />
      </>
    );
  }

  const week = getWeek();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Merge generated sequences into the current week + upcoming list.
  const weekKeys = new Set(week.map((w) => w.key));
  extraPosts.forEach((p) => {
    if (!p.scheduledAt) return;
    const k = new Date(p.scheduledAt).toISOString().slice(0, 10);
    if (weekKeys.has(k)) {
      const slot = week.find((w) => w.key === k);
      if (slot) slot.items.unshift(p);
    }
  });

  const allPosts = [...extraPosts, ...posts];
  const overdue = allPosts.filter(
    (p) => p.status === "Editing" || p.status === "Review"
  );

  return (
    <>
      <PageHeader
        title="Calendar"
        description="What goes live, when it goes live, and whether it's ready."
        actions={
          <>
            <Button variant="outline" size="md">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="md">
              This week
            </Button>
            <Button variant="outline" size="md">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button size="md" onClick={() => setDrawer({ open: true })}>
              <Plus className="w-4 h-4" /> Schedule
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-7 gap-3 mb-6">
        {week.map((d) => {
          const isToday = d.date.toDateString() === today.toDateString();
          return (
            <div key={d.key} className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted font-medium">
                    {d.date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div
                    className={
                      isToday
                        ? "text-[18px] font-semibold text-teal tabular-nums"
                        : "text-[18px] font-semibold text-navy tabular-nums"
                    }
                  >
                    {d.date.getDate()}
                  </div>
                </div>
                {isToday && (
                  <span className="text-[10px] uppercase tracking-wider text-teal font-semibold">
                    Today
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-2 min-h-[260px]">
                {d.items.map((p) => (
                  <div
                    key={p.id}
                    className="lift bg-surface border border-border rounded-[10px] p-2.5 card-base cursor-pointer"
                  >
                    <Thumb gradient={p.thumbnail} size="sm" className="w-full !h-14 !rounded-md" />
                    <div className="text-[12px] text-navy font-medium mt-2 leading-snug line-clamp-2">
                      {p.title}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <Badge
                        tone={p.status === "Published" ? "green" : "teal"}
                      >
                        {p.status}
                      </Badge>
                      <span className="text-[10px] text-muted">{p.type}</span>
                    </div>
                  </div>
                ))}
                {d.items.length === 0 && (
                  <button
                    onClick={() => setDrawer({ open: true, date: d.date })}
                    className="w-full h-full min-h-[120px] rounded-[10px] border border-dashed border-border/70 text-[12px] text-muted hover:border-teal/50 hover:text-teal hover:bg-teal/[0.04] transition-all flex flex-col items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Plan slot
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Upcoming"
            description="Next 7 days"
            action={<Button size="sm" variant="ghost">View all</Button>}
          />
          <ul className="divide-y divide-border -mx-1">
            {allPosts
              .filter((p) => p.status === "Scheduled")
              .slice(0, 5)
              .map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-2 rounded-[10px] border border-transparent hover:border-teal/20 hover:bg-teal/[0.03] transition-colors cursor-pointer">
                  <Thumb gradient={p.thumbnail} size="md" label={p.type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] text-navy font-medium truncate">
                      {p.title}
                    </div>
                    <div className="text-[12px] text-muted">
                      {p.scheduledAt &&
                        new Date(p.scheduledAt).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                    </div>
                  </div>
                  <Badge tone="teal">Scheduled</Badge>
                </li>
              ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Needs attention"
            description="Behind schedule or in review"
          />
          {overdue.length === 0 ? (
            <p className="text-[13px] text-muted">Nothing behind schedule.</p>
          ) : (
            <ul className="space-y-1.5">
              {overdue.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-2 rounded-[10px] border border-transparent hover:border-teal/20 hover:bg-teal/[0.03] transition-colors cursor-pointer">
                  <Thumb gradient={p.thumbnail} size="md" label={p.type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] text-navy font-medium truncate">
                      {p.title}
                    </div>
                    <div className="text-[12px] text-muted">
                      {p.status === "Editing" ? "In editing" : "Awaiting review"}
                    </div>
                  </div>
                  <Badge tone="amber">{p.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <PlanContentDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false })}
        entry="calendar"
        slotDate={drawer.date}
        initialTab="story"
      />
    </>
  );
}
