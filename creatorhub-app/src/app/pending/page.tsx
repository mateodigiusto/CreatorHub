/**
 * /pending — holding screen for a client who joined via a link/QR but whose
 * `client_memberships` row is still `status='pending'` (the agency has
 * approval-required turned on).
 *
 * Routing: resolveUserContext() classifies them as `client-pending`. If they
 * land here already approved (membership flipped to `active`) or with no
 * membership at all, bounce them to their real destination.
 *
 * Phase D fleshes this out with live polling + a notification when approved.
 */

import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { resolveUserContext, destinationFor } from "@/lib/auth/user-context";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const ctx = await resolveUserContext();
  if (ctx.type !== "client-pending") redirect(destinationFor(ctx));

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center py-10 px-8">
        <div className="w-12 h-12 rounded-full bg-accent-soft border border-accent-border flex items-center justify-center mx-auto mb-4">
          <Clock className="w-5 h-5 text-accent" />
        </div>
        <h1 className="text-[18px] font-semibold text-text">
          Waiting for approval
        </h1>
        <p className="text-[13.5px] text-text-2 mt-2 leading-relaxed">
          You&apos;ve requested access to{" "}
          <span className="font-medium text-text">
            {ctx.clientDisplayName}
          </span>{" "}
          at <span className="font-medium text-text">{ctx.organizationName}</span>.
          They&apos;ll review your request shortly — you&apos;ll get into your
          workspace as soon as it&apos;s approved.
        </p>
        <p className="text-[12px] text-muted mt-4">
          You can close this tab and come back later, or check again below.
        </p>
        <div className="flex items-center justify-center gap-2 mt-6">
          <a
            href="/pending"
            className="inline-flex items-center justify-center h-9 px-4 rounded-[8px] text-[13px] font-medium bg-surface-2 border border-border text-text hover:border-accent-border transition-colors"
          >
            Check again
          </a>
          <form action="/api/auth/sign-out" method="post">
            <button
              type="submit"
              className="inline-flex items-center justify-center h-9 px-4 rounded-[8px] text-[13px] font-medium text-muted hover:text-text transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
