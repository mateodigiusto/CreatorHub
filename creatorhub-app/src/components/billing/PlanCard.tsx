"use client";

import { useState, useTransition } from "react";
import { ExternalLink, CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { Cycle, PaidPlan, SubscriptionStatus } from "@/lib/stripe/org-plan-map";

import { showPlanLimit } from "./PlanLimitToast";

type Plan = "free" | PaidPlan;

const PLAN_ORDER: readonly Plan[] = ["free", "starter", "pro", "scale"] as const;
const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  scale: "Scale",
};

function statusBadge(status: SubscriptionStatus) {
  switch (status) {
    case "trialing":
      return { tone: "blue" as const, label: "Trialing" };
    case "active":
      return { tone: "green" as const, label: "Active" };
    case "past_due":
      return { tone: "amber" as const, label: "Past due" };
    case "canceled":
      return { tone: "neutral" as const, label: "Canceled" };
    case "unpaid":
      return { tone: "red" as const, label: "Unpaid" };
    case "incomplete":
      return { tone: "amber" as const, label: "Incomplete" };
    case "incomplete_expired":
      return { tone: "neutral" as const, label: "Setup expired" };
    case "paused":
      return { tone: "neutral" as const, label: "Paused" };
  }
}

function fmtDate(value: Date | string | null): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function nextPaidPlan(current: Plan): PaidPlan | null {
  const idx = PLAN_ORDER.indexOf(current);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
  const next = PLAN_ORDER[idx + 1];
  return next === "free" ? null : next;
}

export function PlanCard({
  plan,
  status,
  trialEndsAt,
  currentPeriodEnd,
  isAdmin,
  hasCustomer,
}: {
  plan: Plan;
  status: SubscriptionStatus;
  trialEndsAt: Date | string | null;
  currentPeriodEnd: Date | string | null;
  isAdmin: boolean;
  hasCustomer: boolean;
}) {
  const badge = statusBadge(status);
  const upgrade = nextPaidPlan(plan);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [busy, startTransition] = useTransition();

  async function openPortal() {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        showPlanLimit({
          message: body.error === "no_customer"
            ? "Start a subscription before opening the billing portal."
            : "Could not open the billing portal. Try again in a moment.",
        });
        return;
      }
      window.location.href = body.url;
    } catch {
      showPlanLimit({ message: "Network error opening the billing portal." });
    }
  }

  async function startCheckout() {
    if (!upgrade) return;
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: upgrade, cycle }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        showPlanLimit({
          message:
            body.error === "stripe_not_configured"
              ? "Billing is not yet configured. Contact support."
              : "Could not start checkout. Try again in a moment.",
        });
        return;
      }
      window.location.href = body.url;
    } catch {
      showPlanLimit({ message: "Network error starting checkout." });
    }
  }

  const trialEndCopy = status === "trialing" ? fmtDate(trialEndsAt) : null;
  const renewalCopy = status === "active" ? fmtDate(currentPeriodEnd) : null;

  return (
    <Card>
      <CardHeader
        title={
          <div className="flex items-center gap-2.5">
            <span>{PLAN_LABEL[plan]}</span>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
        }
        description={
          trialEndCopy ? (
            <>Trial ends {trialEndCopy}. Add a payment method to keep premium features.</>
          ) : renewalCopy ? (
            <>Renews on {renewalCopy}.</>
          ) : status === "past_due" ? (
            <>Your last payment failed. Update billing to restore access.</>
          ) : status === "canceled" ? (
            <>Your subscription has been canceled. Re-subscribe to continue.</>
          ) : (
            <>Your current organization plan.</>
          )
        }
      />

      {!isAdmin && (
        <p className="text-[13px] text-muted">
          Only org admins can change the plan or open the billing portal.
        </p>
      )}

      {isAdmin && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => startTransition(openPortal)}
              disabled={busy || !hasCustomer}
            >
              <CreditCard size={14} />
              Manage subscription
              <ExternalLink size={12} />
            </Button>
            {!hasCustomer && (
              <span className="text-[12px] text-muted">
                The portal becomes available after your first checkout.
              </span>
            )}
          </div>

          {upgrade && (
            <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
              <div>
                <div className="text-[13px] font-medium text-text">
                  Upgrade to {PLAN_LABEL[upgrade]}
                </div>
                <div className="text-[12px] text-muted">
                  Unlocks more clients, monthly views, and premium features.
                </div>
              </div>
              <div className="inline-flex w-fit rounded-[10px] border border-border bg-surface-2 p-0.5">
                {(["monthly", "annual"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCycle(c)}
                    className={cn(
                      "h-7 rounded-[8px] px-3 text-[12px] font-medium transition-colors",
                      cycle === c
                        ? "bg-surface text-text shadow-sm"
                        : "text-muted hover:text-text",
                    )}
                  >
                    {c === "monthly" ? "Monthly" : "Annual"}
                  </button>
                ))}
              </div>
              <div>
                <Button onClick={() => startTransition(startCheckout)} disabled={busy}>
                  Upgrade to {PLAN_LABEL[upgrade]}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
