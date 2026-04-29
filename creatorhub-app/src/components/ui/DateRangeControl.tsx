"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export type RangePreset = "7d" | "30d" | "90d" | "custom";

export type DateRange = {
  preset: RangePreset;
  from: Date;
  to: Date;
};

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "Last 7d" },
  { value: "30d", label: "Last 30d" },
  { value: "90d", label: "Last 90d" },
  { value: "custom", label: "Custom" },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function rangeForPreset(preset: RangePreset, from?: Date, to?: Date): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  switch (preset) {
    case "7d":
      return { preset, from: daysAgo(6), to: today };
    case "30d":
      return { preset, from: daysAgo(29), to: today };
    case "90d":
      return { preset, from: daysAgo(89), to: today };
    case "custom":
      return {
        preset,
        from: from ?? daysAgo(13),
        to: to ?? today,
      };
  }
}

function fmtIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function DateRangeControl({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(fmtIso(value.from));
  const [draftTo, setDraftTo] = useState(fmtIso(value.to));
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftFrom(fmtIso(value.from));
    setDraftTo(fmtIso(value.to));
  }, [value.from, value.to]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pickPreset(p: RangePreset) {
    if (p === "custom") {
      onChange(rangeForPreset("custom", value.from, value.to));
      setOpen(true);
    } else {
      onChange(rangeForPreset(p));
      setOpen(false);
    }
  }

  function applyCustom() {
    const from = new Date(draftFrom);
    const to = new Date(draftTo);
    if (isNaN(+from) || isNaN(+to)) return;
    if (from > to) return;
    onChange({ preset: "custom", from, to });
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative inline-flex items-center gap-2">
      <div className="inline-flex items-center bg-surface-2 border border-border rounded-[10px] p-0.5">
        {PRESETS.map((p) => {
          const active = p.value === value.preset;
          return (
            <button
              key={p.value}
              onClick={() => pickPreset(p.value)}
              className={cn(
                "h-7 px-3 rounded-[8px] text-[12.5px] font-medium cursor-pointer transition-colors",
                active
                  ? "bg-surface text-text shadow-[var(--shadow-card)]"
                  : "text-muted hover:text-text"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {value.preset === "custom" && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-[8px] text-[12px] font-medium bg-surface text-text border border-border cursor-pointer tabular-nums hover:border-accent/40"
        >
          <CalendarIcon className="w-3 h-3" />
          {fmtShort(value.from)} → {fmtShort(value.to)}
        </button>
      )}

      {open && (
        <div
          className="absolute right-0 top-[38px] z-20 w-[300px] p-3 rounded-[12px] bg-surface border border-border shadow-[0_12px_32px_-8px_rgba(7,17,31,0.18),_0_0_0_1px_rgba(11,31,58,0.06)]"
        >
          <div
            className="text-[10.5px] uppercase font-semibold text-muted mb-2"
            style={{ letterSpacing: "0.06em" }}
          >
            Custom range
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            <label className="text-[11px] text-muted flex flex-col gap-1 min-w-0">
              From
              <input
                type="date"
                value={draftFrom}
                max={draftTo}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="w-full h-7 px-2 rounded-md border border-border bg-bg text-text text-[12px] tabular-nums outline-none focus:border-accent/40"
                style={{ colorScheme: "light dark" }}
              />
            </label>
            <label className="text-[11px] text-muted flex flex-col gap-1 min-w-0">
              To
              <input
                type="date"
                value={draftTo}
                min={draftFrom}
                onChange={(e) => setDraftTo(e.target.value)}
                className="w-full h-7 px-2 rounded-md border border-border bg-bg text-text text-[12px] tabular-nums outline-none focus:border-accent/40"
                style={{ colorScheme: "light dark" }}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {[
              { label: "Last 14d", days: 14 },
              { label: "Last 60d", days: 60 },
              { label: "This month", days: new Date().getDate() - 1 },
              { label: "Last 6mo", days: 180 },
            ].map((q) => (
              <button
                key={q.label}
                onClick={() => {
                  const to = new Date();
                  to.setHours(0, 0, 0, 0);
                  const from = new Date(to);
                  from.setDate(to.getDate() - q.days);
                  setDraftFrom(fmtIso(from));
                  setDraftTo(fmtIso(to));
                }}
                className="text-[11px] px-2 py-1 rounded-md bg-surface-2 text-muted border border-border cursor-pointer hover:text-text hover:border-accent/30"
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={applyCustom}>
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
