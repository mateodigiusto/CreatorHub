"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  TrendingUp,
  Activity,
  DollarSign,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Period = "24h" | "7d" | "30d";

type UsageData = {
  period: Period;
  windowStart: string;
  windowEnd: string;
  totals: {
    count: number;
    estimatedCost: number;
    byAction: Array<{
      action: string;
      count: number;
      estimatedCost: number;
    }>;
  };
  timeseries: Array<{ day: string; cost: number }>;
  topUsers: Array<{
    userId: string;
    email: string;
    displayName: string | null;
    counts: Record<string, number>;
    estimatedCost: number;
  }>;
  rates: Record<string, number>;
};

const ACTION_LABELS: Record<string, string> = {
  "script.generated": "Script generations",
  "content_dna.analyzed": "Video analyses",
  "outreach.generated": "Outreach drafts",
};

export default function AdminUsagePage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/usage?period=${period}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? `Failed (${res.status})`);
        setData(null);
        return;
      }
      const json = (await res.json()) as UsageData;
      setData(json);
    } catch {
      setError("network_error");
      setData(null);
    }
  }, [period]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- reload on period change */
    void load();
  }, [load]);

  if (error) {
    const isAuth =
      error === "unauthorized" ||
      error === "not_admin" ||
      error === "admin_disabled_in_prod";
    return (
      <>
        <PageHeader title="Admin · AI usage" description="Cost guardrails dashboard" />
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[14px] font-semibold text-text">
                {isAuth ? "Not authorized" : "Couldn't load usage"}
              </div>
              <div className="text-[12.5px] text-muted mt-1 leading-relaxed">
                {isAuth
                  ? "Your email isn't in the ADMIN_EMAILS allowlist. Add it in env config and redeploy, or sign in with an allowed account."
                  : `Error: ${error}`}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
              </Button>
            </div>
          </div>
        </Card>
      </>
    );
  }

  const maxCost = data?.timeseries.reduce((m, d) => Math.max(m, d.cost), 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Admin · AI usage"
        description="Estimated AI spend rolled up from the audit log. Provider invoices are the source of truth."
        actions={
          <div className="inline-flex rounded-[10px] border border-border bg-surface-2 p-0.5">
            <PeriodToggle label="24h" active={period === "24h"} onClick={() => setPeriod("24h")} />
            <PeriodToggle label="7d" active={period === "7d"} onClick={() => setPeriod("7d")} />
            <PeriodToggle label="30d" active={period === "30d"} onClick={() => setPeriod("30d")} />
          </div>
        }
      />

      {!data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[88px] rounded-[12px] bg-surface-2 border border-border animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Top-line stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <Stat
              icon={<DollarSign className="w-4 h-4" />}
              label="Estimated spend"
              value={`$${data.totals.estimatedCost.toFixed(2)}`}
              hint={`${data.totals.count.toLocaleString()} AI calls`}
            />
            {data.totals.byAction.map((a) => (
              <Stat
                key={a.action}
                icon={<Activity className="w-4 h-4" />}
                label={ACTION_LABELS[a.action] ?? a.action}
                value={a.count.toLocaleString()}
                hint={`$${a.estimatedCost.toFixed(2)} · $${data.rates[a.action]?.toFixed(3) ?? "—"} each`}
              />
            ))}
          </div>

          {/* Per-day cost sparkline */}
          <Card className="mb-5">
            <CardHeader
              title="Daily estimated spend"
              description="Last 30 days. Watch for sudden spikes — usually a runaway loop or onboarding bot."
            />
            {data.timeseries.length === 0 ? (
              <div className="text-[13px] text-muted py-8 text-center">
                No tracked AI calls in this window.
              </div>
            ) : (
              <div className="flex items-end gap-1 h-[120px]">
                {data.timeseries.map((d) => {
                  const heightPct =
                    maxCost > 0 ? Math.max(2, (d.cost / maxCost) * 100) : 2;
                  return (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center justify-end group cursor-default"
                      title={`${d.day} — $${d.cost.toFixed(2)}`}
                    >
                      <div
                        className="w-full bg-accent/60 hover:bg-accent rounded-t-sm transition-colors"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Top users */}
          <Card padded={false}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <div className="text-[15px] font-semibold tracking-[-0.005em] text-text flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted" />
                  Top users by spend
                </div>
                <div className="text-[12.5px] text-muted mt-0.5">
                  Top 25. Investigate anyone over $20/window — that&apos;s
                  ~1300 script generations or ~100 video analyses.
                </div>
              </div>
            </div>
            {data.topUsers.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="text-[13px] text-text font-medium">
                  No AI calls in this window.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead className="text-muted text-[11px] uppercase tracking-wide">
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-2.5 font-semibold">User</th>
                      {data.totals.byAction.map((a) => (
                        <th
                          key={a.action}
                          className="text-right px-3 py-2.5 font-semibold"
                        >
                          {ACTION_LABELS[a.action] ?? a.action}
                        </th>
                      ))}
                      <th className="text-right px-5 py-2.5 font-semibold">
                        Spend
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topUsers.map((u) => (
                      <tr
                        key={u.userId}
                        className="border-b border-border last:border-0 hover:bg-accent/[0.04]"
                      >
                        <td className="px-5 py-2.5">
                          <div className="font-medium text-text">
                            {u.displayName ?? u.email.split("@")[0]}
                          </div>
                          <div className="text-[11px] text-muted truncate max-w-[280px]">
                            {u.email}
                          </div>
                        </td>
                        {data.totals.byAction.map((a) => (
                          <td
                            key={a.action}
                            className="text-right px-3 py-2.5 tabular-nums text-muted"
                          >
                            {u.counts[a.action] ?? 0}
                          </td>
                        ))}
                        <td className="text-right px-5 py-2.5 tabular-nums font-semibold text-text">
                          ${u.estimatedCost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="text-[11.5px] text-muted mt-4 leading-relaxed">
            Cost-per-action rates are display estimates based on Claude Sonnet 4.6,
            OpenAI Whisper, and Apify pricing as of build time. Actual provider
            invoices are the source of truth — use this dashboard to spot
            patterns, not to reconcile billing.
          </div>
        </>
      )}
    </>
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
  value: string;
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
