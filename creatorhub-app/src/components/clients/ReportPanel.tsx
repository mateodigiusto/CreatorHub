"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Calendar,
  FileText,
  TrendingUp,
} from "lucide-react";

type Period = "monthly" | "weekly";

type ReportData = {
  period: Period;
  windowStart: string;
  windowEnd: string;
  scripts: { total: number; draft: number; approved: number; used: number };
  sequences: { total: number; draft: number; scheduled: number; published: number };
  postsPublished: number;
  tasksCompleted: number;
  topPosts: Array<{
    id: string;
    caption: string | null;
    platform: string;
    reach: number | null;
    likes: number | null;
    engagementRate: number | null;
    publishedAt: string | null;
    thumbnailUrl: string | null;
  }>;
};

export function ReportPanel({ relationshipId }: { relationshipId: string }) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/clients/${relationshipId}/report?period=${period}`,
        { credentials: "include" },
      );
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? `Failed (${r.status})`);
        setLoading(false);
        return;
      }
      const json = (await r.json()) as ReportData;
      setData(json);
      setLoading(false);
    } catch {
      setError("network_error");
      setLoading(false);
    }
  }, [relationshipId, period]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- reload on period change */
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[15px] font-semibold tracking-[-0.005em] text-text">
            Client recap
          </div>
          <div className="text-[12px] text-muted mt-0.5">
            Activity rolled up across scripts, calendar, posts, and tasks.
          </div>
        </div>
        <div className="inline-flex rounded-[10px] border border-border bg-surface-2 p-0.5">
          <PeriodToggle
            label="Last 7 days"
            active={period === "weekly"}
            onClick={() => setPeriod("weekly")}
          />
          <PeriodToggle
            label="Last 30 days"
            active={period === "monthly"}
            onClick={() => setPeriod("monthly")}
          />
        </div>
      </div>

      {loading || !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[88px] rounded-[12px] bg-surface-2 border border-border animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[10px] border border-red-500/30 bg-red-500/5 px-3 py-2 text-[12.5px] text-red-700 dark:text-red-300">
          Couldn&apos;t load report: {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat
              icon={<FileText className="w-4 h-4" />}
              label="Scripts"
              value={data.scripts.total}
              hint={`${data.scripts.approved} approved · ${data.scripts.used} used`}
            />
            <Stat
              icon={<Calendar className="w-4 h-4" />}
              label="Sequences"
              value={data.sequences.total}
              hint={`${data.sequences.scheduled} scheduled · ${data.sequences.published} published`}
            />
            <Stat
              icon={<TrendingUp className="w-4 h-4" />}
              label="Posts published"
              value={data.postsPublished}
              hint="In window"
            />
            <Stat
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Tasks completed"
              value={data.tasksCompleted}
              hint="In window"
            />
          </div>

          <div className="rounded-[12px] border border-border bg-surface card-base overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted" />
              <div className="text-[13px] font-semibold text-text">
                Top performing posts
              </div>
              <div className="text-[11.5px] text-muted ml-auto">
                Sorted by engagement rate
              </div>
            </div>
            {data.topPosts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-[13px] text-text font-medium">
                  Nothing published in this window yet.
                </div>
                <div className="text-[12px] text-muted mt-1 max-w-[420px] mx-auto">
                  Once your client publishes posts, the top 5 by engagement rate
                  show up here.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.topPosts.map((p) => (
                  <div
                    key={p.id}
                    className="px-4 py-2.5 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-md bg-surface-2 border border-border shrink-0 overflow-hidden">
                      {p.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-text truncate">
                        {p.caption ?? "Untitled post"}
                      </div>
                      <div className="text-[11.5px] text-muted mt-0.5 capitalize">
                        {p.platform} ·{" "}
                        {p.publishedAt
                          ? new Date(p.publishedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[13px] font-semibold text-text tabular-nums">
                        {fmtPercent(p.engagementRate)}
                      </div>
                      <div className="text-[11px] text-muted tabular-nums">
                        {fmtNum(p.reach)} reach · {fmtNum(p.likes)} likes
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PeriodToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "px-3 h-7 rounded-[8px] text-[12px] font-medium bg-surface text-text border border-border cursor-pointer"
          : "px-3 h-7 rounded-[8px] text-[12px] font-medium text-muted hover:text-text cursor-pointer"
      }
    >
      {label}
    </button>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-surface card-base p-4">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[11.5px] font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="text-[24px] font-semibold tracking-tight text-text mt-1.5 tabular-nums">
        {value}
      </div>
      {hint && <div className="text-[11.5px] text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

function fmtPercent(v: number | null): string {
  if (v === null || v === undefined) return "—";
  const num = Number(v);
  if (Number.isNaN(num)) return "—";
  return `${(num * 100).toFixed(1)}%`;
}

function fmtNum(v: number | null): string {
  if (v === null || v === undefined) return "—";
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}
