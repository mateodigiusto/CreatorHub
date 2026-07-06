import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import type { SubscriptionStatus } from "@/lib/stripe/org-plan-map";

export function PastDueBanner({
  status,
  isAdmin,
}: {
  status: SubscriptionStatus;
  isAdmin: boolean;
}) {
  if (status !== "past_due" && status !== "unpaid") return null;

  const message =
    status === "past_due"
      ? "Your last payment failed. Update billing to restore full access."
      : "Your subscription is unpaid. Update billing to restore full access.";

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border px-4 py-3"
      style={{
        background: "rgba(245, 158, 11, 0.08)",
        borderColor: "rgba(245, 158, 11, 0.30)",
        color: "var(--text)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} style={{ color: "var(--warning)", marginTop: 2 }} />
        <div>
          <div className="text-[13.5px] font-medium text-text">Billing needs attention</div>
          <div className="text-[12.5px] text-muted">{message}</div>
        </div>
      </div>
      {isAdmin && (
        <Link
          href="/settings/billing"
          className="text-[12.5px] font-medium underline underline-offset-2"
          style={{ color: "var(--warning)" }}
        >
          Fix billing
        </Link>
      )}
    </div>
  );
}
