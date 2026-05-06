"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { AiCallout } from "@/components/ui/AiCallout";
import { Thumb } from "@/components/ui/Thumb";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AreaChart } from "@/components/charts/AreaChart";
import {
  DateRangeControl,
  rangeForPreset,
  type DateRange,
} from "@/components/ui/DateRangeControl";
import { Filter, Download } from "lucide-react";
import { useAppState } from "@/lib/store";
import {
  contentTypeBreakdown,
  topPosts,
  aiInsights,
  getReachSeries,
  getFollowerSeries,
} from "@/lib/mock/data";
import { Kpi } from "@/lib/mock/types";
import { cn } from "@/lib/cn";

const analyticsKpis: { kpi: Kpi; trend: number[] }[] = [
  {
    kpi: { label: "Total reach", value: "412.8K", raw: 412800, delta: 18.2, deltaLabel: "vs prior period" },
    trend: [20, 28, 30, 40, 52, 60, 72, 80, 92, 108],
  },
  {
    kpi: { label: "Impressions", value: "1.84M", raw: 1840000, delta: 22.1, deltaLabel: "vs prior period" },
    trend: [60, 70, 90, 110, 140, 180, 210, 240, 260, 300],
  },
  {
    kpi: { label: "Engagement", value: "86,120", raw: 86120, delta: 9.4, deltaLabel: "vs prior period" },
    trend: [20, 24, 28, 32, 40, 44, 52, 58, 64, 70],
  },
  {
    kpi: { label: "Profile visits", value: "22,408", raw: 22408, delta: 3.1, deltaLabel: "vs prior period" },
    trend: [10, 11, 12, 12, 13, 14, 14, 15, 16, 17],
  },
];

export default function AnalyticsPage() {
  const { connected } = useAppState();
  const [perfRange, setPerfRange] = useState<DateRange>(() => rangeForPreset("30d"));
  const [growthRange, setGrowthRange] = useState<DateRange>(() => rangeForPreset("90d"));

  if (!connected) {
    return (
      <>
        <PageHeader
          title="Analytics"
          description="The data layer behind your content."
        />
        <EmptyState
          title="No analytics yet."
          description="Connect a platform to see reach, engagement, leads, and top posts."
          primaryAction={{ label: "Connect a platform" }}
        />
      </>
    );
  }

  const performanceSeries = getReachSeries(perfRange.from, perfRange.to);
  const growthSeries = getFollowerSeries(growthRange.from, growthRange.to);

  return (
    <>
      <DemoBadge />
      <PageHeader
        title="Analytics"
        description="What's working, why it's working, and where to lean in."
        actions={
          <>
            <Button variant="outline" size="md">
              <Filter className="w-3.5 h-3.5" /> Filters
            </Button>
            <Button variant="outline" size="md">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        {analyticsKpis.map(({ kpi, trend }) => (
          <KpiCard key={kpi.label} kpi={kpi} trend={trend} />
        ))}
      </div>

      <div
        className="grid gap-4 mb-5"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <Card>
          <CardHeader
            title="Performance"
            description="Reach and engagement over time"
            action={<DateRangeControl value={perfRange} onChange={setPerfRange} />}
          />
          <AreaChart height={260} data={performanceSeries} />
        </Card>

        <Card style={{ minWidth: 0, overflow: "hidden" }}>
          <CardHeader
            title="Follower growth"
            description="Audience trajectory"
            action={<DateRangeControl value={growthRange} onChange={setGrowthRange} />}
          />
          <div className="w-full min-w-0 overflow-hidden">
            <AreaChart height={200} data={growthSeries} />
          </div>
          <div className="mt-3.5 pt-3.5 border-t border-border flex items-baseline gap-2 flex-wrap">
            <span className="text-[20px] font-semibold text-text tabular-nums">
              +1,240
            </span>
            <Badge tone="green">+2.6%</Badge>
            <span className="text-[12px] text-muted ml-auto">
              vs prior 12 weeks
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card>
          <CardHeader
            title="Content type breakdown"
            description="Reach by format"
          />
          <ul className="space-y-3.5">
            {contentTypeBreakdown.map((c) => (
              <li key={c.type}>
                <div className="flex items-center justify-between text-[13px] mb-1.5">
                  <span className="text-text font-medium">{c.type}</span>
                  <span className="text-muted tabular-nums">
                    {(c.reach / 1000).toFixed(1)}K · {c.share}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${c.share}%`,
                      background: "linear-gradient(90deg, #0B1F3A, #1B4FD4)",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Messages / Leads"
            description="DM volume from content"
          />
          <div className="text-[28px] font-semibold tracking-[-0.02em] text-text leading-none">
            342
          </div>
          <div className="mt-1.5">
            <Badge tone="green">+18.2%</Badge>
          </div>
          <div className="mt-4 space-y-3">
            <LeadRow label="Reels → DMs" value="248" share={72} />
            <LeadRow label="Carousels → DMs" value="64" share={19} />
            <LeadRow label="Static → DMs" value="30" share={9} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Best posting time"
            description="Based on your last 60 days"
          />
          <Heatmap />
          <div className="mt-3 text-[12.5px] text-muted leading-[1.55]">
            Peak:{" "}
            <span className="text-text font-medium">Wed 6–8pm</span> · 2.1× lift.
            <span className="block mt-1 text-accent">
              You under-posted Wed evenings — 3 of last 4 went out off-peak.
            </span>
          </div>
        </Card>
      </div>

      <Card padded={false} className="mb-5">
        <div className="px-5 pt-5 pb-3.5">
          <CardHeader
            title="Top posts"
            description="Highest performing in this period"
            action={<Button variant="ghost" size="sm">View all</Button>}
          />
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-[11.5px] uppercase text-muted" style={{ letterSpacing: "0.06em" }}>
              <th className="text-left font-medium px-5 py-2">Content</th>
              <th className="text-left font-medium py-2">Platform</th>
              <th className="text-right font-medium py-2">Reach</th>
              <th className="text-right font-medium py-2">Likes</th>
              <th className="text-right font-medium py-2">Saves</th>
              <th className="text-right font-medium py-2">ER</th>
              <th className="text-right font-medium px-5 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {topPosts.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-accent/[0.04] transition-colors cursor-pointer">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Thumb gradient={p.thumbnail} size="sm" />
                    <span className="text-text font-medium">{p.title}</span>
                  </div>
                </td>
                <td className="py-3">
                  <Badge tone="neutral">{p.platform}</Badge>
                </td>
                <td className="text-right tabular-nums py-3">
                  {(p.reach / 1000).toFixed(1)}K
                </td>
                <td className="text-right tabular-nums py-3">
                  {(p.likes / 1000).toFixed(1)}K
                </td>
                <td className="text-right tabular-nums py-3">{p.saves}</td>
                <td
                  className="text-right tabular-nums py-3 font-semibold"
                  style={{ color: "#14315E" }}
                >
                  {p.engagementRate}%
                </td>
                <td className="text-right tabular-nums px-5 py-3 text-muted">
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <AiCallout
        title="AI explanation"
        body={aiInsights.analytics}
        cta="Turn this into ideas"
      />
    </>
  );
}

function LeadRow({
  label,
  value,
  share,
}: {
  label: string;
  value: string;
  share: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[13px] mb-1">
        <span className="text-text">{label}</span>
        <span className="text-muted tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${share}%`,
            background: "linear-gradient(90deg, #0B1F3A, #1B4FD4)",
          }}
        />
      </div>
    </div>
  );
}

function Heatmap() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const data = [
    [0.2, 0.3, 0.4, 0.3, 0.4, 0.5, 0.4],
    [0.6, 0.7, 0.8, 0.65, 0.75, 0.6, 0.5],
    [0.9, 0.95, 1.0, 0.85, 0.9, 0.7, 0.55],
    [0.5, 0.55, 0.6, 0.5, 0.8, 1.0, 0.85],
  ];
  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] text-muted mb-1">
        {days.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div
        className="grid grid-cols-7 gap-1"
        style={{ gridTemplateRows: "repeat(4, 1fr)" }}
      >
        {data.flat().map((v, i) => (
          <div
            key={i}
            className={cn("rounded-[4px]")}
            style={{
              aspectRatio: "1 / 1",
              background:
                v > 0.95
                  ? "#14315E"
                  : `rgba(20,49,94,${0.08 + v * 0.55})`,
            }}
          />
        ))}
      </div>
    </>
  );
}
