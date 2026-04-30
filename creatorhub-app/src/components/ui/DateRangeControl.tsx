"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
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

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function fmtMD(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}
function inRange(d: Date, a: Date, b: Date): boolean {
  return d.getTime() >= a.getTime() && d.getTime() <= b.getTime();
}

export function DateRangeControl({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date | null>(value.from);
  const [draftTo, setDraftTo] = useState<Date | null>(value.to);
  const [hover, setHover] = useState<Date | null>(null);
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(value.from));
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Sync local draft when parent value changes externally. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftFrom(value.from);
    setDraftTo(value.to);
    setAnchor(startOfMonth(value.from));
  }, [value.from, value.to]);

  /* Click-outside + Esc to close */
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
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

  function clickDay(d: Date) {
    /* Two-click pattern: first click = start, second click = end. */
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(d);
      setDraftTo(null);
      setHover(null);
      return;
    }
    if (isBefore(d, draftFrom)) {
      /* User picked an earlier "to" — flip them. */
      setDraftFrom(d);
      setDraftTo(draftFrom);
      onChange({ preset: "custom", from: d, to: draftFrom });
      setOpen(false);
      return;
    }
    setDraftTo(d);
    onChange({ preset: "custom", from: draftFrom, to: d });
    setOpen(false);
  }

  function applyManual(from: Date | null, to: Date | null) {
    if (!from || !to) return;
    if (isNaN(+from) || isNaN(+to)) return;
    if (isBefore(to, from)) return;
    onChange({ preset: "custom", from, to });
  }

  return (
    <div ref={wrapRef} className="relative inline-flex items-center gap-2 flex-wrap">
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
          className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 bottom-3 sm:bottom-auto sm:top-[38px] z-50 sm:w-auto p-4 rounded-[16px] bg-surface/95 backdrop-blur-xl border border-border shadow-[0_24px_48px_-12px_rgba(7,17,31,0.28),_0_0_0_1px_rgba(11,31,58,0.06)]"
        >
          <RangeFields
            from={draftFrom}
            to={draftTo}
            onChangeFrom={(d) => {
              setDraftFrom(d);
              applyManual(d, draftTo);
            }}
            onChangeTo={(d) => {
              setDraftTo(d);
              applyManual(draftFrom, d);
            }}
          />

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CalendarMonth
              monthStart={anchor}
              from={draftFrom}
              to={draftTo}
              hover={hover}
              onHover={setHover}
              onPick={clickDay}
              showLeftNav
              onPrev={() => setAnchor((a) => addMonths(a, -1))}
              onMonthChange={(m) => setAnchor(m)}
            />
            <CalendarMonth
              monthStart={addMonths(anchor, 1)}
              from={draftFrom}
              to={draftTo}
              hover={hover}
              onHover={setHover}
              onPick={clickDay}
              showRightNav
              onNext={() => setAnchor((a) => addMonths(a, 1))}
              onMonthChange={(m) => setAnchor(addMonths(m, -1))}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { label: "Last 7d", days: 7 },
              { label: "Last 14d", days: 14 },
              { label: "Last 30d", days: 30 },
              { label: "Last 60d", days: 60 },
              { label: "Last 90d", days: 90 },
            ].map((q) => (
              <button
                key={q.label}
                onClick={() => {
                  const to = new Date();
                  to.setHours(0, 0, 0, 0);
                  const from = new Date(to);
                  from.setDate(to.getDate() - (q.days - 1));
                  setDraftFrom(from);
                  setDraftTo(to);
                  setAnchor(startOfMonth(from));
                  onChange({ preset: "custom", from, to });
                }}
                className="text-[11px] px-2 py-1 rounded-md bg-surface-2 text-muted border border-border cursor-pointer hover:text-text hover:border-accent/30 transition-colors"
              >
                {q.label}
              </button>
            ))}
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Start / End text fields ───────────────────────────────────── */

function RangeFields({
  from,
  to,
  onChangeFrom,
  onChangeTo,
}: {
  from: Date | null;
  to: Date | null;
  onChangeFrom: (d: Date | null) => void;
  onChangeTo: (d: Date | null) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <DateField label="Start" value={from} onChange={onChangeFrom} />
      <DateField label="End" value={to} onChange={onChangeTo} />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[12.5px] text-muted shrink-0">{label}</span>
      <input
        type="text"
        value={value ? fmtMD(value) : ""}
        placeholder="MM / DD / YYYY"
        onChange={(e) => {
          const v = e.target.value.replace(/\s/g, "");
          const parts = v.split("/").map((p) => parseInt(p, 10));
          if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
            const d = new Date(parts[2], parts[0] - 1, parts[1]);
            d.setHours(0, 0, 0, 0);
            if (!isNaN(+d)) onChange(d);
          }
        }}
        className="w-full h-9 px-3 rounded-[10px] bg-bg border border-border text-text text-[13px] tabular-nums outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}

/* ─── Single month grid ─────────────────────────────────────────── */

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function CalendarMonth({
  monthStart,
  from,
  to,
  hover,
  onHover,
  onPick,
  showLeftNav,
  showRightNav,
  onPrev,
  onNext,
  onMonthChange,
}: {
  monthStart: Date;
  from: Date | null;
  to: Date | null;
  hover: Date | null;
  onHover: (d: Date | null) => void;
  onPick: (d: Date) => void;
  showLeftNav?: boolean;
  showRightNav?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onMonthChange?: (newMonthStart: Date) => void;
}) {
  const days = useMemo(() => buildMonthGrid(monthStart), [monthStart]);
  const previewTo = !to && hover && from && !isBefore(hover, from) ? hover : null;
  const effectiveTo = to ?? previewTo;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-2">
        {showLeftNav ? (
          <button
            onClick={onPrev}
            className="w-7 h-7 grid place-items-center rounded-md text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <span className="w-7 h-7" />
        )}
        <MonthYearPicker monthStart={monthStart} onChange={onMonthChange ?? (() => {})} />
        {showRightNav ? (
          <button
            onClick={onNext}
            className="w-7 h-7 grid place-items-center rounded-md text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <span className="w-7 h-7" />
        )}
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[11px] text-muted py-1.5">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const isStart = from && sameDay(d, from);
          const isEnd = effectiveTo && sameDay(d, effectiveTo);
          const inSel =
            from && effectiveTo
              ? inRange(d, from, effectiveTo)
              : false;
          const today = sameDay(d, new Date());
          return (
            <DayCell
              key={i}
              day={d}
              isStart={!!isStart}
              isEnd={!!isEnd}
              inRange={!!inSel}
              isToday={today}
              onPick={onPick}
              onHover={onHover}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayCell({
  day,
  isStart,
  isEnd,
  inRange: inR,
  isToday,
  onPick,
  onHover,
}: {
  day: Date;
  isStart: boolean;
  isEnd: boolean;
  inRange: boolean;
  isToday: boolean;
  onPick: (d: Date) => void;
  onHover: (d: Date | null) => void;
}) {
  const isEdge = isStart || isEnd;
  return (
    <div
      className={cn(
        "relative h-9 grid place-items-center",
        inR && !isEdge && "bg-accent-soft",
        inR && isStart && "bg-gradient-to-r from-transparent to-accent-soft",
        inR && isEnd && "bg-gradient-to-l from-transparent to-accent-soft"
      )}
    >
      <button
        onClick={() => onPick(day)}
        onMouseEnter={() => onHover(day)}
        onMouseLeave={() => onHover(null)}
        className={cn(
          "relative z-10 w-9 h-9 grid place-items-center text-[12.5px] cursor-pointer transition-colors rounded-full tabular-nums",
          isEdge
            ? "bg-accent text-white font-semibold"
            : inR
            ? "text-accent font-medium"
            : "text-text hover:bg-surface-2",
          !isEdge && isToday && "ring-1 ring-accent/40"
        )}
      >
        {day.getDate()}
      </button>
    </div>
  );
}

function MonthYearPicker({
  monthStart,
  onChange,
}: {
  monthStart: Date;
  onChange: (newMonthStart: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => cur - 4 + i);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-[13.5px] font-semibold text-text px-2 py-1 rounded-md hover:bg-surface-2 cursor-pointer"
      >
        {MONTH_NAMES[month]} {year}
      </button>
      {open && (
        <div className="absolute top-[100%] left-1/2 -translate-x-1/2 mt-1 z-30 p-2 rounded-[10px] bg-surface border border-border shadow-[0_12px_32px_-8px_rgba(7,17,31,0.18)] flex gap-2">
          <select
            value={month}
            onChange={(e) => onChange(new Date(year, parseInt(e.target.value, 10), 1))}
            className="text-[12px] bg-surface border border-border rounded-md px-1.5 py-1 text-text"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => onChange(new Date(parseInt(e.target.value, 10), month, 1))}
            className="text-[12px] bg-surface border border-border rounded-md px-1.5 py-1 text-text tabular-nums"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function buildMonthGrid(monthStart: Date): (Date | null)[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Su
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
