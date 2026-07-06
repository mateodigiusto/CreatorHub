"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import {
  useDemoTeam,
  timeStatus,
  type Task,
  type TimeStatus,
} from "@/lib/demo/team";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TONE: Record<TimeStatus, { bg: string; text: string; border: string }> = {
  overdue: { bg: "rgba(220,38,38,0.10)", text: "#DC2626", border: "rgba(220,38,38,0.22)" },
  due_today: { bg: "rgba(37,99,235,0.10)", text: "#2563EB", border: "rgba(37,99,235,0.22)" },
  open: { bg: "var(--surface-2)", text: "var(--text-2)", border: "var(--border)" },
  done: { bg: "rgba(22,163,74,0.10)", text: "#16A34A", border: "rgba(22,163,74,0.22)" },
};

/**
 * Provisional month-grid view of My Tasks, plotted on their due date and tinted
 * by time-status. Final Calendar behaviour pending the rest of the spec.
 */
export function EditorCalendar() {
  const router = useRouter();
  const { myTasks } = useDemoTeam();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const cells = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor));
    const gridEnd = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of myTasks) {
      const key = format(parseISO(t.dueDate), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return map;
  }, [myTasks]);

  const today = new Date();

  return (
    <>
      <div className="mb-3 flex items-center gap-2 text-[12px] text-muted">
        <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
        Provisional layout — tasks plotted on their due date, tinted by time-status.
        Refining once the rest of the Calendar spec lands.
      </div>

      <div className="bg-surface border border-border rounded-[14px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text">
            {format(cursor, "LLLL yyyy")}
          </h3>
          <div className="flex items-center gap-1">
            <IconButton
              aria-label="Previous month"
              onClick={() => setCursor((d) => subMonths(d, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </IconButton>
            <button
              onClick={() => setCursor(startOfMonth(new Date()))}
              className="px-2.5 h-7 text-[12.5px] text-muted hover:text-text cursor-pointer"
            >
              Today
            </button>
            <IconButton
              aria-label="Next month"
              onClick={() => setCursor((d) => addMonths(d, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </IconButton>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border bg-surface-2">
          {DOW.map((d) => (
            <div
              key={d}
              className="px-3 py-2 text-[11px] uppercase tracking-[0.06em] font-semibold text-muted"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day) => {
            const dim = !isSameMonth(day, cursor);
            const isToday = isSameDay(day, today);
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = byDate.get(key) ?? [];
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[112px] p-2 border-b border-r border-border",
                  dim ? "bg-surface-2/40" : "bg-surface",
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-6 h-6 text-[12px] rounded-full tabular-nums",
                      isToday
                        ? "bg-text text-bg font-semibold"
                        : dim
                          ? "text-muted"
                          : "text-text",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayTasks.length > 2 && (
                    <span className="text-[10.5px] text-muted tabular-nums">
                      +{dayTasks.length - 2}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 2).map((t) => {
                    const tone = TONE[timeStatus(t)];
                    return (
                      <button
                        key={t.id}
                        onClick={() => router.push(`/editor-portal/task/${t.id}`)}
                        className="block w-full text-left px-1.5 py-1 rounded-[6px] border transition-opacity hover:opacity-80 cursor-pointer"
                        style={{ background: tone.bg, borderColor: tone.border }}
                      >
                        <span
                          className="block text-[11px] font-medium line-clamp-1"
                          style={{ color: tone.text }}
                        >
                          {t.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
