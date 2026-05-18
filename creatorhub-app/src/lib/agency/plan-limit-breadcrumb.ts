/**
 * Records a Sentry breadcrumb when a plan-limit gate trips. Breadcrumb
 * (not message event) so it sits on the timeline preceding whatever the
 * user did next — usually an upgrade-funnel decision point.
 *
 * Sentry is lazy-loaded so this file is a no-op if `@sentry/nextjs` isn't
 * bound (dev without DSN, preview without SENTRY_*). Never throws.
 *
 * Search Sentry's UI for the tag `code: plan_limit` to surface the
 * upgrade-funnel friction pattern.
 */

import type { Plan } from "@/lib/agency/_phase1_deps";

export type PlanLimitBreadcrumb = {
  capability: "add_client" | "ai_analyzer" | "video_upload";
  plan: Plan;
  organizationId?: string;
};

type SentryShape = {
  addBreadcrumb?: (b: {
    category: string;
    type?: string;
    level?: string;
    message?: string;
    data?: Record<string, unknown>;
  }) => void;
};

/* Lazy dynamic-import wrapper — keeps the Sentry SDK out of the
   request-handler critical path when SENTRY_* env vars aren't set. */
let sentryPromise: Promise<SentryShape | null> | null = null;
function loadSentry(): Promise<SentryShape | null> {
  if (sentryPromise) return sentryPromise;
  sentryPromise = import("@sentry/nextjs")
    .then((mod) => mod as unknown as SentryShape)
    .catch(() => null);
  return sentryPromise;
}

export function recordPlanLimitBreadcrumb(entry: PlanLimitBreadcrumb): void {
  void loadSentry().then((sentry) => {
    if (!sentry?.addBreadcrumb) return;
    try {
      sentry.addBreadcrumb({
        category: "billing.plan_limit",
        type: "info",
        level: "info",
        message: `Plan limit hit: ${entry.capability}`,
        data: {
          code: "plan_limit",
          capability: entry.capability,
          plan: entry.plan,
          organizationId: entry.organizationId,
        },
      });
    } catch {
      /* Swallow — observability must never throw into request handlers. */
    }
  });
}
