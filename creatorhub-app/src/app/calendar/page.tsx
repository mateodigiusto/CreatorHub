"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { IconButton } from "@/components/ui/IconButton";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAppState } from "@/lib/store";
import { posts } from "@/lib/mock/data";
import { Post } from "@/lib/mock/types";
import { cn } from "@/lib/cn";
import { PlanContentDrawer } from "@/components/plan/PlanContentDrawer";

type DayEvent = { title: string; platform: string; grad: string };

function bucketEvents(allPosts: Post[]): Record<number, DayEvent[]> {
  const out: Record<number, DayEvent[]> = {};
  allPosts.forEach((p) => {
    const iso = p.publishedAt || p.scheduledAt;
    if (!iso) return;
    const d = new Date(iso);
    if (d.getMonth() !== 3) return;
    const day = d.getDate();
    if (!out[day]) out[day] = [];
    if (out[day].length >= 2) return;
    out[day].push({
      title: p.title,
      platform: p.platform,
      grad: p.thumbnail,
    });
  });
  return out;
}

export default function CalendarPage() {
  const { connected, extraPosts } = useAppState();
  const [view, setView] = useState<"week" | "month">("month");
  const [drawer, setDrawer] = useState<{ open: boolean; date?: Date }>({
    open: false,
  });

  if (!connected) {
    return (
      <>
        <PageHeader title="Calendar" description="Your publishing system." />
        <EmptyState
          title="Your calendar is empty."
          description="Plan your first week of content and keep your publishing consistent."
          primaryAction={{ label: "Plan first week" }}
        />
      </>
    );
  }

  const allPosts = [...extraPosts, ...posts];
  const events = bucketEvents(allPosts);
  const today = 22;
  const days = Array.from({ length: 35 }).map((_, i) => i - 2);
  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Plan, schedule, and review across all platforms."
        actions={
          <>
            <Button variant="outline" size="md">
              Today
            </Button>
            <div className="inline-flex border border-border rounded-[10px] overflow-hidden">
              <IconButton>
                <ChevronLeft className="w-3.5 h-3.5" />
              </IconButton>
              <IconButton>
                <ChevronRight className="w-3.5 h-3.5" />
              </IconButton>
            </div>
            <Tabs
              value={view}
              onChange={(v) => setView(v as typeof view)}
              options={[
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
              ]}
            />
            <Button size="md" onClick={() => setDrawer({ open: true })}>
              <Plus className="w-3.5 h-3.5" /> Schedule
            </Button>
          </>
        }
      />

      <Card padded={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-text">
            April 2026
          </h2>
          <div className="flex items-center gap-2.5 text-[12px] text-muted">
            <LegendDot color="#2563EB" /> Reel
            <LegendDot color="#1E3A8A" /> YouTube
            <LegendDot color="#070B14" /> Carousel
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border">
          {dows.map((d) => (
            <div
              key={d}
              className="px-3 py-2 text-[11px] uppercase font-medium text-muted"
              style={{ letterSpacing: "0.05em" }}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((d, idx) => {
            const valid = d >= 1 && d <= 30;
            const isToday = d === today;
            const dayEvents = events[d] || [];
            const display = valid ? d : d <= 0 ? 31 + d : d - 30;
            return (
              <div
                key={idx}
                onClick={() => {
                  if (valid) {
                    const date = new Date(2026, 3, d);
                    setDrawer({ open: true, date });
                  }
                }}
                className={cn(
                  "min-h-[110px] p-2 cursor-pointer transition-colors",
                  (idx + 1) % 7 !== 0 && "border-r border-border",
                  idx >= 7 && "border-t border-border",
                  !valid && "opacity-40",
                  valid && "hover:bg-accent/[0.03]"
                )}
                style={
                  isToday
                    ? { background: "rgba(11,31,58,0.05)" }
                    : undefined
                }
              >
                <div
                  className={cn(
                    "inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11.5px] tabular-nums",
                    isToday ? "font-semibold text-white" : "font-medium text-text"
                  )}
                  style={
                    isToday
                      ? {
                          background:
                            "linear-gradient(180deg, #14315E 0%, #0B1F3A 100%)",
                          boxShadow:
                            "0 1px 0 rgba(255,255,255,0.10) inset, 0 1px 3px rgba(7,17,31,0.30)",
                        }
                      : undefined
                  }
                >
                  {display}
                </div>
                <div className="flex flex-col gap-1 mt-1.5">
                  {dayEvents.map((ev, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-1.5 py-[3px] bg-surface border border-border rounded-md cursor-pointer card-base"
                    >
                      <div
                        className="w-1 h-3.5 rounded-[2px]"
                        style={{ background: ev.grad }}
                      />
                      <span className="text-[11px] font-medium text-text whitespace-nowrap overflow-hidden text-ellipsis">
                        {ev.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

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

function LegendDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-[2px] mr-1"
      style={{ background: color }}
    />
  );
}
