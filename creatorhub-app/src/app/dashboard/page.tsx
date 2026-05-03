"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AiCallout } from "@/components/ui/AiCallout";
import { Thumb } from "@/components/ui/Thumb";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AreaChart } from "@/components/charts/AreaChart";
import { BarRow } from "@/components/charts/BarRow";
import {
  DateRangeControl,
  rangeForPreset,
  type DateRange,
} from "@/components/ui/DateRangeControl";
import {
  Filter,
  Plus,
  Calendar as CalendarIcon,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useAppState } from "@/lib/store";
import {
  kpis,
  kpiTrends,
  platformReach,
  topPosts,
  upcoming,
  aiInsights,
  getReachSeries,
} from "@/lib/mock/data";
import { welcomeCopy, nextActionFor } from "@/lib/onboarding/personalize";
import { cn } from "@/lib/cn";

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

type ScheduleItem = {
  id: string;
  title: string;
  platform: string;
  thumbnail: string;
  scheduledAt: string;
};

export default function DashboardPage() {
  const { connected, profile } = useAppState();
  const [range, setRange] = useState<DateRange>(() => rangeForPreset("30d"));
  const [dbSequences, setDbSequences] = useState<DbSequence[] | null>(null);
  const now = useMemo(() => new Date(), []);
  const welcome = welcomeCopy(profile);
  const nextAction = nextActionFor(profile);

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

  /* DB sequences scheduled in the next 7 days, then mock upcoming as fallback. */
  const scheduleItems = useMemo<ScheduleItem[]>(() => {
    const nowMs = now.getTime();
    const horizon = nowMs + 7 * 24 * 60 * 60 * 1000;
    const dbItems: ScheduleItem[] = (dbSequences ?? [])
      .filter((s) => {
        if (!s.scheduled_at) return false;
        const t = new Date(s.scheduled_at).getTime();
        return t >= nowMs && t <= horizon;
      })
      .map((s) => ({
        id: s.id,
        title: s.title,
        platform: "Instagram",
        thumbnail: pickGradient(s.id),
        scheduledAt: s.scheduled_at as string,
      }))
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );
    const mockItems: ScheduleItem[] = upcoming
      .filter((p) => p.scheduledAt)
      .map((p) => ({
        id: p.id,
        title: p.title,
        platform: p.platform,
        thumbnail: p.thumbnail,
        scheduledAt: p.scheduledAt as string,
      }));
    return [...dbItems, ...mockItems];
  }, [dbSequences, now]);

  if (!connected) {
    return (
      <>
        <PageHeader
          title={welcome.greeting}
          description="Connect a platform to start seeing what's working."
        />
        <EmptyState
          title="Your content command center is almost ready."
          description="Connect Instagram, YouTube, TikTok, or X to pull in your latest posts, track performance, and turn your content data into weekly action steps."
          primaryAction={{ label: "Connect a platform" }}
        />
      </>
    );
  }

  const reachSeries = getReachSeries(range.from, range.to);

  return (
    <>
      <PageHeader
        title={welcome.greeting}
        description={welcome.sub}
        actions={
          <>
            <Button variant="outline" size="md">
              <Filter className="w-3.5 h-3.5" /> Filters
            </Button>
            <Button size="md">
              <Plus className="w-3.5 h-3.5" /> New content
            </Button>
          </>
        }
      />

      {profile && (
        <Link
          href={nextAction.href}
          className="lift mb-5 flex items-center justify-between gap-3 px-4 py-3 rounded-[12px] border border-accent/30 bg-accent-soft cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="text-[10.5px] uppercase font-semibold text-accent shrink-0"
              style={{ letterSpacing: "0.08em" }}
            >
              Next move
            </span>
            <span className="text-[13.5px] font-semibold text-text truncate">
              {nextAction.label}
            </span>
            <span className="text-[12px] text-muted truncate hidden sm:inline">
              {nextAction.hint}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-accent shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} trend={kpiTrends[k.label]} />
        ))}
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4 mb-4">
        <Card>
          <CardHeader
            title="Reach over time"
            description="Aggregated across YouTube, Instagram, TikTok, X."
            action={<DateRangeControl value={range} onChange={setRange} />}
          />
          <AreaChart height={220} data={reachSeries} />
        </Card>
        <Card>
          <CardHeader title="By platform" description="Last 30 days" />
          <div className="flex flex-col gap-3.5">
            {platformReach.map((p) => (
              <BarRow
                key={p.platform}
                label={p.platform}
                value={p.reach}
                max={140000}
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <AiCallout
          body={aiInsights.dashboard}
          cta="Plan next week from this insight"
        />
        <Card>
          <CardHeader
            title="Up next"
            description="Scheduled in the next 7 days"
            action={
              <Link
                href="/calendar"
                className="text-[12.5px] text-accent font-medium inline-flex items-center gap-1"
              >
                View calendar <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <ScheduleList items={scheduleItems} />
        </Card>
      </div>

      <Card padded={false}>
        <div className="px-5 pt-5">
          <CardHeader
            title="Top performing posts"
            description="Last 30 days · sorted by reach"
            action={
              <Button variant="ghost" size="sm">
                All posts <ArrowRight className="w-3 h-3" />
              </Button>
            }
          />
        </div>
        <PostsTable />
      </Card>
    </>
  );
}

function ScheduleList({ items }: { items: ScheduleItem[] }) {
  return (
    <div className="flex flex-col">
      {items.slice(0, 3).map((p, i) => {
        const date = new Date(p.scheduledAt);
        const day = date.toLocaleDateString("en-US", { weekday: "short" });
        const time = date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        return (
          <div
            key={p.id}
            className={cn(
              "flex items-center gap-3 py-2.5",
              i > 0 && "border-t border-border"
            )}
          >
            <Thumb gradient={p.thumbnail} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium text-text truncate">
                {p.title}
              </div>
              <div className="text-[12px] text-muted mt-0.5 flex items-center gap-1.5">
                <Badge tone="neutral">{p.platform}</Badge>
                <span>
                  {day} · {time}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <div className="text-[13px] text-muted py-4 flex items-center gap-2">
          <CalendarIcon className="w-3.5 h-3.5" />
          Nothing scheduled. Plan your week →
        </div>
      )}
    </div>
  );
}

function PostsTable() {
  const rows = topPosts.slice(0, 4);
  return (
    <div
      className="grid px-5"
      style={{
        gridTemplateColumns: "1.5fr 110px 110px 90px 110px",
      }}
    >
      <Cell head>Post</Cell>
      <Cell head>Platform</Cell>
      <Cell head right>Reach</Cell>
      <Cell head right>Eng.</Cell>
      <Cell head right>Date</Cell>
      {rows.map((r, i) => {
        const date = r.publishedAt
          ? new Date(r.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "—";
        const isTop = i === 0;
        return (
          <div key={r.id} className="contents">
            <Cell>
              <div className="flex items-center gap-3">
                <Thumb gradient={r.thumbnail} size="sm" />
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-medium text-text">
                    {r.title}
                  </span>
                  {isTop && <Badge tone="accent">Top performer</Badge>}
                </div>
              </div>
            </Cell>
            <Cell>
              <Badge tone="neutral">{r.platform}</Badge>
            </Cell>
            <Cell right mono>
              {(r.reach / 1000).toFixed(1)}K
            </Cell>
            <Cell right mono>
              {r.engagementRate}%
            </Cell>
            <Cell right>{date}</Cell>
          </div>
        );
      })}
    </div>
  );
}

function Cell({
  children,
  head,
  right,
  mono,
}: {
  children: React.ReactNode;
  head?: boolean;
  right?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className={cn(
        "py-3 flex items-center",
        right ? "justify-end text-right" : "justify-start text-left",
        head ? "text-[11px] uppercase font-medium text-muted" : "text-[13px] text-text",
        !head && "border-t border-border",
        mono && "tabular-nums"
      )}
      style={head ? { letterSpacing: "0.05em" } : undefined}
    >
      {children}
    </div>
  );
}
