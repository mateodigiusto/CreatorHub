"use client";

import { useCallback, useEffect, useState } from "react";
import { Flame, Trophy, Calendar } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StreakResponse } from "@/lib/clients/types";

type Props = {
  relationshipId: string;
};

export function StreakPanel({ relationshipId }: Props) {
  const [data, setData] = useState<StreakResponse | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/clients/${relationshipId}/streak`, {
        credentials: "include",
      });
      if (!r.ok) {
        setData({ current: 0, longest: 0, grid: [] });
        return;
      }
      const json = (await r.json()) as StreakResponse;
      setData(json);
    } catch {
      setData({ current: 0, longest: 0, grid: [] });
    }
  }, [relationshipId]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  if (data === null) {
    return (
      <div className="space-y-3">
        <div className="h-24 rounded-[12px] bg-surface-2 border border-border animate-pulse" />
        <div className="h-24 rounded-[12px] bg-surface-2 border border-border animate-pulse" />
      </div>
    );
  }

  const hasAnyTasks = data.grid.some((g) => g.state !== "no_tasks");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <StreakStat
          icon={<Flame className="w-5 h-5" />}
          label="Current streak"
          value={data.current}
          tone="accent"
        />
        <StreakStat
          icon={<Trophy className="w-5 h-5" />}
          label="Longest in 30 days"
          value={data.longest}
          tone="neutral"
        />
      </div>

      <div>
        <h4 className="text-[12px] font-semibold text-muted uppercase tracking-wider mb-2 inline-flex items-center gap-1.5">
          <Calendar className="w-3 h-3" /> Last 30 days
        </h4>
        {!hasAnyTasks ? (
          <div className="text-[13px] text-muted text-center py-6 rounded-[10px] border border-dashed border-border">
            No daily tasks yet — assign one to start tracking the streak.
          </div>
        ) : (
          <div className="grid grid-cols-15 gap-1" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
            {data.grid.map((g) => (
              <DayCell key={g.day} day={g.day} state={g.state} />
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-3 text-[10.5px] text-muted">
          <LegendDot color="bg-green-500" label="Complete" />
          <LegendDot color="bg-red-400" label="Missed" />
          <LegendDot color="bg-amber-400" label="Today" />
          <LegendDot color="bg-surface-3" label="No tasks" />
        </div>
      </div>
    </div>
  );
}

function StreakStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "accent" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border p-4",
        tone === "accent"
          ? "bg-accent-soft/40 border-accent-border"
          : "bg-surface border-border",
      )}
    >
      <div
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-full mb-2",
          tone === "accent"
            ? "bg-accent text-white"
            : "bg-surface-2 text-text",
        )}
      >
        {icon}
      </div>
      <div className="text-[24px] font-bold text-text tabular-nums leading-none">
        {value}
      </div>
      <div className="text-[11.5px] text-muted mt-1">{label}</div>
    </div>
  );
}

function DayCell({
  day,
  state,
}: {
  day: string;
  state: "complete" | "miss" | "no_tasks" | "in_progress";
}) {
  const color =
    state === "complete"
      ? "bg-green-500"
      : state === "miss"
        ? "bg-red-400"
        : state === "in_progress"
          ? "bg-amber-400"
          : "bg-surface-3";
  const label = `${day}: ${state.replace("_", " ")}`;
  return (
    <div
      title={label}
      aria-label={label}
      className={cn(
        "aspect-square rounded-[3px] transition-transform hover:scale-110",
        color,
      )}
    />
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-block w-2 h-2 rounded-[2px]", color)} />
      <span>{label}</span>
    </span>
  );
}
