"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AiCallout } from "@/components/ui/AiCallout";
import { Thumb } from "@/components/ui/Thumb";
import { Tabs } from "@/components/ui/Tabs";
import { AreaChart } from "@/components/charts/AreaChart";
import { Download, Share2, Plus } from "lucide-react";
import { useAppState } from "@/lib/store";
import {
  reports,
  topPosts,
  followerSeriesWeekly,
  followerSeriesMonthly,
  aiInsights,
} from "@/lib/mock/data";
import { handleFor } from "@/lib/onboarding/personalize";

export default function ReportsPage() {
  const { connected, profile } = useAppState();
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  const reportHandle = handleFor(profile);

  if (!connected) {
    return (
      <>
        <PageHeader
          title="Reports"
          description="Performance summaries for you, your team, or your clients."
        />
        <EmptyState
          title="No reports yet."
          description="Generate your first weekly performance summary once content data is available."
          primaryAction={{ label: "Connect a platform" }}
        />
      </>
    );
  }

  const r = range === "weekly" ? reports.weekly : reports.monthly;
  const series =
    range === "weekly" ? followerSeriesWeekly : followerSeriesMonthly;
  const aiBody =
    range === "weekly" ? aiInsights.reportsWeekly : aiInsights.reportsMonthly;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Clean summaries of what worked and what's next."
        actions={
          <>
            <Button variant="outline" size="md">
              <Share2 className="w-3.5 h-3.5" /> Share
            </Button>
            <Button variant="outline" size="md">
              <Download className="w-3.5 h-3.5" /> Export PDF
            </Button>
            <Button size="md">
              <Plus className="w-3.5 h-3.5" /> New report
            </Button>
          </>
        }
      />

      <div className="flex items-center justify-between mb-5">
        <Tabs
          value={range}
          onChange={(v) => setRange(v as typeof range)}
          options={[
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
        <div className="text-[12.5px] text-muted">{r.range}</div>
      </div>

      {/* Dark always-on hero */}
      <div
        className="relative overflow-hidden rounded-[14px] mb-5"
        style={{
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px rgba(7,11,20,0.18)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #070B14 0%, #0B1220 60%, #111827 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(96,165,250,0.20), transparent 65%)",
            filter: "blur(40px)",
          }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-24 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.18), transparent 65%)",
            filter: "blur(50px)",
          }}
        />

        <div className="relative p-7 text-white">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div
                className="text-[11.5px] uppercase font-semibold"
                style={{ letterSpacing: "0.08em", color: "#93C5FD" }}
              >
                {range === "weekly" ? "Weekly summary" : "Monthly summary"}
              </div>
              <h2 className="text-[28px] font-semibold tracking-[-0.02em] mt-1.5 whitespace-nowrap">
                {r.range}
              </h2>
              <p className="text-[13.5px] text-white/65 mt-1.5">
                For @{reportHandle} · prepared by CreatorHub
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-white"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#93C5FD" }}
              />
              Auto-generated
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mt-7">
            <ReportStat label="Posts" value={String(r.posts)} />
            <ReportStat
              label="Reach"
              value={r.reach}
              delta={`+${r.reachDelta}%`}
            />
            <ReportStat
              label="Engagement"
              value={r.engagement}
              delta={`+${r.engagementDelta}pp`}
            />
            <ReportStat
              label="Leads"
              value={String(r.leads)}
              delta={`+${r.leadsDelta}%`}
            />
            <ReportStat label="Followers" value={r.followers} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4 mb-5">
        <Card>
          <CardHeader
            title="Growth"
            description={`Follower trajectory · ${
              range === "weekly" ? "this week" : "this month"
            }`}
          />
          <AreaChart
            height={240}
            data={series.map((y, i, arr) => ({
              x: i === 0 ? "Start" : i === arr.length - 1 ? "End" : "",
              y,
            }))}
          />
        </Card>

        <AiCallout title="Summary" body={aiBody} />
      </div>

      <Card>
        <CardHeader
          title="Top content this period"
          description="What earned the most reach"
          action={
            <Button variant="ghost" size="sm">
              View all
            </Button>
          }
        />
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 list-none p-0 m-0">
          {topPosts.slice(0, 3).map((p) => (
            <li
              key={p.id}
              className="lift bg-surface border border-border rounded-[12px] p-3 cursor-pointer card-base"
            >
              <Thumb gradient={p.thumbnail} size="lg" />
              <div className="mt-3">
                <div className="text-[13px] font-medium text-text leading-[1.4] line-clamp-2">
                  {p.title}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Badge tone="neutral">{p.platform}</Badge>
                  <span className="text-[12px] text-muted tabular-nums">
                    {(p.reach / 1000).toFixed(1)}K reach
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function ReportStat({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <div>
      <div
        className="text-[11.5px] uppercase"
        style={{
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div className="text-[26px] font-semibold tracking-[-0.02em] mt-1.5 tabular-nums">
        {value}
      </div>
      {delta && (
        <div
          className="text-[12px] font-medium mt-0.5"
          style={{ color: "#93C5FD" }}
        >
          {delta}
        </div>
      )}
    </div>
  );
}
