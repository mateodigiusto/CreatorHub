/**
 * /settings/billing — Phase 6 org-level billing page (STAGED).
 *
 * Server component. Reads the current org row (plan, status, trial /
 * renewal dates, stripe_customer_id) via `requireOrg()`. Renders:
 *   - PageHeader with the org name
 *   - PlanCard (status badge, trial/renewal copy, portal + upgrade CTA)
 *   - UsageCard (clients used/max, monthly views used/max)
 *   - PlanGrid (4 cards, current plan highlighted)
 *
 * Usage counts:
 *   - clientsUsed comes from `countActiveClients(orgId)` in Phase 2's
 *     ./billing/limits. If Phase 2 hasn't shipped that helper yet, we
 *     fall back to a direct Supabase count on clients.status='active'.
 *   - monthlyViewsUsed sums `content_metrics.views` for the current
 *     period. The `content_metrics` table is owned by Phase 3 — if it
 *     hasn't shipped, the try/catch defaults to 0.
 *
 * Moves to `src/app/settings/billing/page.tsx` at cutover.
 */

import type { ReactNode } from "react";

import { PlanCard } from "@/components/billing/PlanCard";
import { UsageCard } from "@/components/billing/UsageCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireOrg } from "@/lib/agency/_phase1_deps";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { PaidPlan, SubscriptionStatus } from "@/lib/stripe/org-plan-map";

type Plan = "free" | PaidPlan;

const PLAN_DEF: Record<
  Plan,
  { name: string; tagline: string; bullets: string[]; maxClients: number; maxMonthlyViews: number }
> = {
  free: {
    name: "Free",
    tagline: "Solo workspaces and trial drives.",
    bullets: ["1 client", "10k monthly views", "No AI", "No video upload"],
    maxClients: 1,
    maxMonthlyViews: 10_000,
  },
  starter: {
    name: "Starter",
    tagline: "Small agencies running a handful of creators.",
    bullets: ["5 clients", "100k monthly views", "AI brand analyzer", "Video upload"],
    maxClients: 5,
    maxMonthlyViews: 100_000,
  },
  pro: {
    name: "Pro",
    tagline: "Established agencies with a roster.",
    bullets: ["20 clients", "1M monthly views", "AI brand analyzer", "Video upload", "Custom domain"],
    maxClients: 20,
    maxMonthlyViews: 1_000_000,
  },
  scale: {
    name: "Scale",
    tagline: "Unlimited everything for enterprise teams.",
    bullets: ["Unlimited clients", "Unlimited views", "AI brand analyzer", "Video upload", "Custom domain"],
    maxClients: Number.POSITIVE_INFINITY,
    maxMonthlyViews: Number.POSITIVE_INFINITY,
  },
};

const PLAN_ORDER: readonly Plan[] = ["free", "starter", "pro", "scale"];

type OrgRow = {
  id: string;
  name: string;
  plan: Plan;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

async function countActiveClientsFallback(orgId: string): Promise<number> {
  const supabase = await getSupabaseServer();
  try {
    const { count, error } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "active");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function sumMonthlyViews(orgId: string): Promise<number> {
  const supabase = await getSupabaseServer();
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);
  try {
    const { data, error } = await supabase
      .from("content_metrics")
      .select("views")
      .eq("organization_id", orgId)
      .gte("updated_at", periodStart.toISOString())
      .returns<Array<{ views: number | null }>>();
    if (error || !data) return 0;
    return data.reduce((acc, row) => acc + (row.views ?? 0), 0);
  } catch {
    return 0;
  }
}

function PlanGrid({ current }: { current: Plan }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {PLAN_ORDER.map((p) => {
        const def = PLAN_DEF[p];
        const isCurrent = p === current;
        return (
          <Card
            key={p}
            className={isCurrent ? "ring-1 ring-accent/30" : undefined}
            style={isCurrent ? { background: "var(--accent-soft)" } : undefined}
          >
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-semibold text-text">{def.name}</div>
              {isCurrent && <Badge tone="accent">Current</Badge>}
            </div>
            <div className="mt-1 text-[12.5px] text-muted">{def.tagline}</div>
            <ul className="mt-3 space-y-1.5">
              {def.bullets.map((b) => (
                <li key={b} className="text-[12.5px] text-text">
                  · {b}
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

export default async function BillingPage(): Promise<ReactNode> {
  const session = await requireOrg();

  const supabase = await getSupabaseServer();
  const { data: orgRow } = await supabase
    .from("organizations")
    .select(
      "id, name, plan, subscription_status, trial_ends_at, current_period_end, stripe_customer_id",
    )
    .eq("id", session.organization.id)
    .returns<OrgRow[]>()
    .maybeSingle();
  if (!orgRow) {
    return (
      <div className="p-6">
        <PageHeader title="Billing" description="Could not load your organization." />
      </div>
    );
  }

  const planDef = PLAN_DEF[orgRow.plan];
  const clientsUsed = await countActiveClientsFallback(orgRow.id);
  const monthlyViewsUsed = await sumMonthlyViews(orgRow.id);

  return (
    <div className="p-6">
      <PageHeader
        title="Billing"
        description={`Manage the ${orgRow.name} subscription and review usage for the current period.`}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PlanCard
          plan={orgRow.plan}
          status={orgRow.subscription_status}
          trialEndsAt={orgRow.trial_ends_at}
          currentPeriodEnd={orgRow.current_period_end}
          isAdmin={session.isAdmin}
          hasCustomer={Boolean(orgRow.stripe_customer_id)}
        />
        <UsageCard
          clientsUsed={clientsUsed}
          clientsMax={planDef.maxClients}
          monthlyViewsUsed={monthlyViewsUsed}
          monthlyViewsMax={planDef.maxMonthlyViews}
        />
      </div>
      <div className="mt-6">
        <CardHeader title="Plans" description="Pick the tier that fits your roster." />
        <PlanGrid current={orgRow.plan} />
      </div>
    </div>
  );
}
