"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AiCallout } from "@/components/ui/AiCallout";
import { Thumb } from "@/components/ui/Thumb";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { GrowthChart } from "@/components/charts/GrowthChart";
import { Tabs } from "@/components/ui/Tabs";
import { useAppState } from "@/lib/store";
import {
  kpis,
  topPosts,
  contentTypeBreakdown,
  aiInsights,
} from "@/lib/mock/data";
import { Download, Filter } from "lucide-react";
import { useState } from "react";

export default function AnalyticsPage() {
  const { connected } = useAppState();
  const [range, setRange] = useState<"7" | "30" | "90">("30");

  if (!connected) {
    return (
      <>
        <PageHeader
          title="Analytics"
          description="The data layer behind your content."
        />
        <EmptyState
          title="No analytics yet."
          description="Connect your Instagram account to see reach, engagement, messages, top posts, and performance trends."
          primaryAction={{ label: "Connect Instagram" }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="What's working, why it's working, and where to lean in."
        actions={
          <>
            <Button variant="outline" size="md">
              <Filter className="w-4 h-4" /> Filters
            </Button>
            <Button variant="outline" size="md">
              <Download className="w-4 h-4" /> Export
            </Button>
          </>
        }
      />

      <div className="flex items-center justify-between mb-6">
        <Tabs
          value={range}
          onChange={(v) => setRange(v as typeof range)}
          options={[
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
            { value: "90", label: "Last 90 days" },
          ]}
        />
        <div className="text-[12.5px] text-muted">
          Compared to previous period
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="col-span-2">
          <CardHeader
            title="Performance"
            description="Reach and engagement"
            action={
              <div className="flex items-center gap-3 text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal" /> Reach
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-blue" /> Engagement
                </span>
              </div>
            }
          />
          <PerformanceChart height={260} />
        </Card>

        <Card>
          <CardHeader title="Follower growth" description="Last 12 weeks" />
          <GrowthChart />
          <div className="mt-3 pt-3 border-t border-border flex items-baseline gap-2">
            <span className="text-[20px] font-semibold text-navy">+1,240</span>
            <span className="text-[12.5px] text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-medium">
              +2.6%
            </span>
            <span className="text-[12px] text-muted ml-auto">vs prior 12 weeks</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader
            title="Content type breakdown"
            description="Reach by format"
          />
          <ul className="space-y-3">
            {contentTypeBreakdown.map((c) => (
              <li key={c.type}>
                <div className="flex items-center justify-between text-[13px] mb-1.5">
                  <span className="text-navy font-medium">{c.type}</span>
                  <span className="text-muted tabular-nums">
                    {(c.reach / 1000).toFixed(1)}K · {c.share}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal"
                    style={{ width: `${c.share}%` }}
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
          <div className="text-[28px] font-semibold tracking-tight text-navy">
            342
          </div>
          <div className="text-[12.5px] text-emerald-700 bg-emerald-500/10 inline-block px-1.5 py-0.5 rounded-full font-medium mt-1">
            +18.2%
          </div>
          <div className="mt-4 space-y-2 text-[13px]">
            <Row label="Reels → DMs" value="248" share={72} />
            <Row label="Carousels → DMs" value="64" share={19} />
            <Row label="Static → DMs" value="30" share={9} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Best posting time"
            description="Based on your last 60 days"
          />
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted mb-2">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 grid-rows-4 gap-1">
            {Array.from({ length: 28 }).map((_, i) => {
              const intensity = Math.min(
                1,
                Math.abs(Math.sin(i * 1.3) + Math.cos(i / 2)) / 2
              );
              return (
                <div
                  key={i}
                  className="aspect-square rounded-[4px]"
                  style={{
                    background: `rgba(37,99,235,${0.08 + intensity * 0.7})`,
                  }}
                />
              );
            })}
          </div>
          <div className="mt-3 text-[12.5px] text-muted leading-relaxed">
            Peak: <span className="text-navy font-medium">Wed 6–8pm</span> · 2.1× lift.
            <span className="block mt-1 text-teal">
              You under-posted on Wed evenings — 3 of last 4 went out off-peak.
            </span>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Top posts"
          description="Highest performing in this period"
          action={<Button variant="ghost" size="sm">View all</Button>}
        />
        <div className="overflow-hidden -mx-5">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11.5px] uppercase tracking-wider text-muted">
                <th className="text-left font-medium px-5 py-2">Content</th>
                <th className="text-left font-medium py-2">Type</th>
                <th className="text-right font-medium py-2">Reach</th>
                <th className="text-right font-medium py-2">Likes</th>
                <th className="text-right font-medium py-2">Saves</th>
                <th className="text-right font-medium py-2">ER</th>
                <th className="text-right font-medium px-5 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {topPosts.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border hover:bg-teal/[0.04] transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Thumb gradient={p.thumbnail} size="sm" />
                      <span className="text-navy font-medium">{p.title}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge tone="neutral">{p.type}</Badge>
                  </td>
                  <td className="text-right tabular-nums py-3">
                    {(p.reach / 1000).toFixed(1)}K
                  </td>
                  <td className="text-right tabular-nums py-3">
                    {(p.likes / 1000).toFixed(1)}K
                  </td>
                  <td className="text-right tabular-nums py-3">{p.saves}</td>
                  <td className="text-right tabular-nums py-3 text-teal font-medium">
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
        </div>
      </Card>

      <AiCallout
        title="AI explanation"
        body={aiInsights.analytics}
        cta="Turn this into ideas"
      />
    </>
  );
}

function Row({
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
      <div className="flex items-center justify-between mb-1">
        <span className="text-navy">{label}</span>
        <span className="text-muted tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-blue"
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}
