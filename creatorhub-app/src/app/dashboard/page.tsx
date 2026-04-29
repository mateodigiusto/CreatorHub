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
import { useAppState } from "@/lib/store";
import { kpis, topPosts, upcoming, aiInsights, posts } from "@/lib/mock/data";
import { Calendar, Lightbulb, FileText, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { connected, extraPosts } = useAppState();

  if (!connected) {
    return (
      <>
        <PageHeader title="Dashboard" description="Your daily content command center." />
        <EmptyState
          title="Your content command center is almost ready."
          description="Connect Instagram to pull in your latest posts, track performance, and turn your content data into weekly action steps."
          primaryAction={{ label: "Connect Instagram" }}
          secondaryAction={{ label: "Explore with sample data" }}
        />
      </>
    );
  }

  const allPosts = [...extraPosts, ...posts];
  const pipelineCounts = {
    Idea: allPosts.filter((p) => p.status === "Idea").length,
    Review: allPosts.filter((p) => p.status === "Review").length,
    Editing: allPosts.filter((p) => p.status === "Editing").length,
    Scheduled: allPosts.filter((p) => p.status === "Scheduled").length,
  };

  return (
    <>
      <PageHeader
        title="Good morning, Mateo"
        description="Here's what your content is doing today, what needs attention, and what to ship next."
        actions={
          <>
            <Button variant="outline" size="md">
              <BarChart3 className="w-4 h-4" /> View analytics
            </Button>
            <Button size="md">
              <FileText className="w-4 h-4" /> New content
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader
              title="Performance"
              description="Reach and engagement, last 30 days"
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
            <PerformanceChart />
          </Card>

          <AiCallout body={aiInsights.dashboard} cta="Plan next week from this insight" />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Top content"
              description="Highest reach, last 30 days"
              action={
                <Link
                  href="/analytics"
                  className="text-[12.5px] text-teal font-medium inline-flex items-center gap-1 hover:gap-1.5 transition-all"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
            <ul className="space-y-1.5">
              {topPosts.slice(0, 4).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-[10px] border border-transparent hover:border-teal/20 hover:bg-teal/[0.03] transition-colors cursor-pointer"
                >
                  <Thumb gradient={p.thumbnail} size="md" label={p.type} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] text-navy font-medium truncate">
                      {p.title}
                    </div>
                    <div className="text-[12px] text-muted">
                      {(p.reach / 1000).toFixed(1)}K reach · {p.engagementRate}% ER
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Quick actions" />
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={Lightbulb} label="New idea" href="/ideas" tone="teal" />
              <QuickAction icon={Calendar} label="Plan week" href="/calendar" tone="cyan" />
              <QuickAction icon={FileText} label="New post" href="/content" tone="blue" />
              <QuickAction icon={BarChart3} label="Analyze" href="/analytics" tone="navy" />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader
            title="Upcoming"
            description="Scheduled in the next 7 days"
            action={
              <Link
                href="/calendar"
                className="text-[12.5px] text-teal font-medium inline-flex items-center gap-1"
              >
                Open calendar <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <p className="text-[13px] text-muted">Nothing scheduled. Plan your week →</p>
          ) : (
            <ul className="space-y-1.5">
              {upcoming.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 p-2 rounded-[10px] border border-transparent hover:border-teal/20 hover:bg-teal/[0.03] transition-colors cursor-pointer"
                >
                  <Thumb gradient={p.thumbnail} size="md" label={p.type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] text-navy font-medium truncate">
                      {p.title}
                    </div>
                    <div className="text-[12px] text-muted">
                      {p.scheduledAt
                        ? new Date(p.scheduledAt).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </div>
                  </div>
                  <Badge tone="teal">Scheduled</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Pipeline" description="Content in production" />
          <div className="space-y-2.5">
            {Object.entries(pipelineCounts).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between py-1.5"
              >
                <span className="text-[13px] text-navy">{k}</span>
                <span className="text-[13px] font-semibold text-navy tabular-nums">
                  {v}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/content"
            className="mt-4 block text-center text-[12.5px] text-teal font-medium border-t border-border pt-3 -mx-5 -mb-2 px-5 hover:bg-teal/5 rounded-b-[14px] py-3"
          >
            Open content board →
          </Link>
        </Card>
      </div>
    </>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
  tone = "teal",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  tone?: "teal" | "cyan" | "blue" | "navy";
}) {
  const tones = {
    teal: "bg-teal/10 text-teal",
    cyan: "bg-cyan-soft/15 text-teal-blue",
    blue: "bg-teal-blue/10 text-teal-blue",
    navy: "bg-navy/[0.06] text-navy",
  } as const;
  return (
    <Link
      href={href}
      className="lift flex flex-col items-start gap-2 p-3 rounded-[10px] border border-border bg-surface card-base"
    >
      <div className={`w-7 h-7 rounded-md grid place-items-center ${tones[tone]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-[13px] font-medium text-navy">{label}</span>
    </Link>
  );
}
