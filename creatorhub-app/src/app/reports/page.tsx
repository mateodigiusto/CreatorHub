"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AiCallout } from "@/components/ui/AiCallout";
import { Thumb } from "@/components/ui/Thumb";
import { Tabs } from "@/components/ui/Tabs";
import { GrowthChart } from "@/components/charts/GrowthChart";
import { useAppState } from "@/lib/store";
import { reports, topPosts, aiInsights } from "@/lib/mock/data";
import { Download, FileDown, Share2 } from "lucide-react";
import { useState } from "react";

export default function ReportsPage() {
  const { connected } = useAppState();
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");

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
          primaryAction={{ label: "Connect Instagram" }}
        />
      </>
    );
  }

  const r = range === "weekly" ? reports.weekly : reports.monthly;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Clean summaries of what worked and what's next."
        actions={
          <>
            <Button variant="outline" size="md">
              <Share2 className="w-4 h-4" /> Share
            </Button>
            <Button variant="outline" size="md">
              <FileDown className="w-4 h-4" /> Export PDF
            </Button>
            <Button size="md">
              <Download className="w-4 h-4" /> New report
            </Button>
          </>
        }
      />

      <div className="flex items-center justify-between mb-6">
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

      <Card className="mb-6 text-white relative overflow-hidden" padded={false}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #070B14 0%, #0B1220 60%, #111827 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
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
        <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div>
            <div
              className="text-[11.5px] uppercase tracking-wider font-semibold"
              style={{ color: "#93C5FD" }}
            >
              {range === "weekly" ? "Weekly summary" : "Monthly summary"}
            </div>
            <h2 className="text-[28px] font-semibold tracking-[-0.02em] mt-1">
              {r.range}
            </h2>
            <p className="text-[13.5px] text-white/65 mt-1.5">
              For @mateo.creates · prepared by CreatorHub
            </p>
          </div>
          <Badge
            tone="teal"
            className="!bg-white/10 !text-white border border-white/15"
          >
            Auto-generated
          </Badge>
        </div>

        <div className="grid grid-cols-5 gap-4 mt-7">
          <ReportStat label="Posts" value={r.posts.toString()} />
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
            value={r.leads.toString()}
            delta={`+${r.leadsDelta}%`}
          />
          <ReportStat label="Followers" value={r.followers} />
        </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="col-span-2">
          <CardHeader
            title="Growth"
            description={`Follower trajectory · ${r.range.toLowerCase()}`}
          />
          <GrowthChart height={260} />
        </Card>

        <div>
          <AiCallout
            title="Summary"
            body={
              range === "weekly"
                ? aiInsights.reportsWeekly
                : aiInsights.analytics
            }
          />
        </div>
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
        <ul className="grid grid-cols-3 gap-3">
          {topPosts.slice(0, 3).map((p) => (
            <li
              key={p.id}
              className="lift lift-strong border border-border rounded-[12px] p-3 bg-surface card-base cursor-pointer"
            >
              <Thumb gradient={p.thumbnail} size="lg" />
              <div className="mt-3">
                <div className="text-[13px] font-medium text-navy leading-snug line-clamp-2">
                  {p.title}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Badge tone="neutral">{p.type}</Badge>
                  <span className="text-[12px] text-muted">
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
      <div className="text-[11.5px] text-white/55 uppercase tracking-wider">
        {label}
      </div>
      <div className="text-[26px] font-semibold tracking-[-0.02em] mt-1 tabular-nums">{value}</div>
      {delta && (
        <div
          className="text-[12px] mt-0.5 font-medium"
          style={{ color: "#93C5FD" }}
        >
          {delta}
        </div>
      )}
    </div>
  );
}
