"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { IconButton } from "@/components/ui/IconButton";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAppState } from "@/lib/store";
import { posts as mockPosts } from "@/lib/mock/data";
import { Post } from "@/lib/mock/types";
import { cn } from "@/lib/cn";
import { PlanContentDrawer } from "@/components/plan/PlanContentDrawer";

type DayEvent = { title: string; platform: string; grad: string };

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg,#1E293B,#3B82F6)",
  "linear-gradient(135deg,#0F766E,#14B8A6)",
  "linear-gradient(135deg,#7C2D12,#F59E0B)",
  "linear-gradient(135deg,#312E81,#6366F1)",
  "linear-gradient(135deg,#0F172A,#94A3B8)",
];
function pickGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % 9999;
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length];
}

type DbSequence = {
  id: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
};

function bucketEvents(
  events: Array<{ title: string; platform: string; grad: string; iso: string }>,
  year: number,
  month: number,
): Record<number, DayEvent[]> {
  const out: Record<number, DayEvent[]> = {};
  events.forEach((ev) => {
    const d = new Date(ev.iso);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    if (!out[day]) out[day] = [];
    if (out[day].length >= 2) return;
    out[day].push({ title: ev.title, platform: ev.platform, grad: ev.grad });
  });
  return out;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarPage() {
  const { connected, extraPosts } = useAppState();
  const [view, setView] = useState<"week" | "month">("month");
  const [drawer, setDrawer] = useState<{ open: boolean; date?: Date }>({
    open: false,
  });
  const [dbSequences, setDbSequences] = useState<DbSequence[] | null>(null);

  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const loadSequences = useCallback(async () => {
    try {
      const r = await fetch("/api/sequences", { credentials: "include" });
      if (!r.ok) {
        setDbSequences([]);
        return;
      }
      const json = (await r.json()) as { sequences: DbSequence[] };
      setDbSequences(json.sequences);
    } catch {
      setDbSequences([]);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void loadSequences();
  }, [loadSequences]);

  const events = useMemo(() => {
    /* DB sequences first (newest), then localStorage extras, then demo posts. */
    const dbEvents = (dbSequences ?? [])
      .filter((s) => s.scheduled_at || s.published_at)
      .map((s) => ({
        title: s.title,
        platform: "Instagram",
        grad: pickGradient(s.id),
        iso: (s.published_at ?? s.scheduled_at) as string,
      }));
    const localEvents = extraPosts
      .filter((p): p is Post & { scheduledAt: string } => Boolean(p.publishedAt || p.scheduledAt))
      .map((p) => ({
        title: p.title,
        platform: p.platform,
        grad: p.thumbnail,
        iso: (p.publishedAt ?? p.scheduledAt) as string,
      }));
    const mockEvents = mockPosts
      .filter((p) => p.publishedAt || p.scheduledAt)
      .map((p) => ({
        title: p.title,
        platform: p.platform,
        grad: p.thumbnail,
        iso: (p.publishedAt ?? p.scheduledAt) as string,
      }));
    return [...dbEvents, ...localEvents, ...mockEvents];
  }, [dbSequences, extraPosts]);

  const bucketed = useMemo(
    () => bucketEvents(events, cursor.year, cursor.month),
    [events, cursor],
  );

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

  /* Build the 35-cell grid for the current cursor month, with leading
     days from the prev month + trailing from next month so the grid is
     always 5 rows × 7 cols. Week starts on Monday. */
  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const monStart = (firstOfMonth.getDay() + 6) % 7; // 0 = Mon
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const daysInPrev = new Date(cursor.year, cursor.month, 0).getDate();
  const cells: Array<{ display: number; valid: boolean; absDay: number }> = [];
  for (let i = 0; i < 35; i++) {
    const offset = i - monStart;
    if (offset < 0) {
      cells.push({ display: daysInPrev + offset + 1, valid: false, absDay: 0 });
    } else if (offset >= daysInMonth) {
      cells.push({ display: offset - daysInMonth + 1, valid: false, absDay: 0 });
    } else {
      cells.push({ display: offset + 1, valid: true, absDay: offset + 1 });
    }
  }

  const isCurrentMonth =
    cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const today = isCurrentMonth ? now.getDate() : -1;

  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }
  function goToday() {
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Plan, schedule, and review across all platforms."
        actions={
          <>
            <Button variant="outline" size="md" onClick={goToday}>
              Today
            </Button>
            <div className="inline-flex border border-border rounded-[10px] overflow-hidden">
              <IconButton onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <ChevronLeft className="w-3.5 h-3.5" />
              </IconButton>
              <IconButton onClick={() => shiftMonth(1)} aria-label="Next month">
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
            {MONTH_NAMES[cursor.month]} {cursor.year}
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
          {cells.map((cell, idx) => {
            const isToday = cell.valid && cell.absDay === today;
            const dayEvents = cell.valid ? bucketed[cell.absDay] || [] : [];
            return (
              <div
                key={idx}
                onClick={() => {
                  if (cell.valid) {
                    const date = new Date(cursor.year, cursor.month, cell.absDay);
                    setDrawer({ open: true, date });
                  }
                }}
                className={cn(
                  "min-h-[110px] p-2 cursor-pointer transition-colors",
                  (idx + 1) % 7 !== 0 && "border-r border-border",
                  idx >= 7 && "border-t border-border",
                  !cell.valid && "opacity-40",
                  cell.valid && "hover:bg-accent/[0.03]",
                )}
                style={isToday ? { background: "rgba(11,31,58,0.05)" } : undefined}
              >
                <div
                  className={cn(
                    "inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11.5px] tabular-nums",
                    isToday ? "font-semibold text-white" : "font-medium text-text",
                  )}
                  style={
                    isToday
                      ? {
                          background: "linear-gradient(180deg, #14315E 0%, #0B1F3A 100%)",
                          boxShadow:
                            "0 1px 0 rgba(255,255,255,0.10) inset, 0 1px 3px rgba(7,17,31,0.30)",
                        }
                      : undefined
                  }
                >
                  {cell.display}
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
