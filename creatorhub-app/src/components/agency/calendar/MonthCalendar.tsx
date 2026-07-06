"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import {
  CONTENT_STATUS_LABEL,
  CONTENT_TYPE_LABEL,
  type ContentItemWithMetrics,
} from "@/lib/agency/content";

type Props = {
  items: ContentItemWithMetrics[];
  onOpen: (id: string) => void;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Read-only month-grid view of `planned_post_date`.
 * Drag-to-reschedule is deferred — see PHASE_4_NOTES.md.
 */
export function MonthCalendar({ items, onOpen }: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const cells = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor));
    const gridEnd = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ContentItemWithMetrics[]>();
    for (const i of items) {
      if (!i.planned_post_date) continue;
      // planned_post_date is a date string YYYY-MM-DD — comparing by that key.
      const key = i.planned_post_date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(i);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const today = new Date();

  return (
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
            className="px-2.5 h-7 text-[12.5px] text-muted hover:text-text"
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
          const dayItems = itemsByDate.get(key) ?? [];
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[112px] p-2 border-b border-r border-border ${
                dim ? "bg-surface-2/40" : "bg-surface"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-[12px] rounded-full tabular-nums ${
                    isToday
                      ? "bg-text text-bg font-semibold"
                      : dim
                      ? "text-muted"
                      : "text-text"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {dayItems.length > 2 && (
                  <span className="text-[10.5px] text-muted tabular-nums">
                    +{dayItems.length - 2}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {dayItems.slice(0, 2).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onOpen(item.id)}
                    className="block w-full text-left px-2 py-1 rounded-[6px] bg-surface-2 hover:border-accent/40 border border-transparent transition-colors"
                  >
                    <p className="text-[11.5px] font-medium text-text line-clamp-1">
                      {item.title || "Untitled"}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge tone="accent">
                        {CONTENT_STATUS_LABEL[item.status]}
                      </Badge>
                      <span className="text-[10.5px] text-muted">
                        {CONTENT_TYPE_LABEL[item.content_type]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
