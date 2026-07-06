/**
 * Public status page Meta DSR + the in-app delete flow link to.
 *
 * Reads `?code=` from the URL, looks up the deletion_requests row, shows
 * "pending" with the 30-day completion window, or "completed" once the
 * hard-delete cron ran.
 *
 * No auth — anyone with the code can view their own deletion status (the
 * code itself is the secret). This is also why we DON'T leak the email or
 * any other personal info on this page.
 */

import { getSupabaseServiceRole } from "@/lib/supabase/server";

const TERMINAL_STATES: Record<string, { label: string; tone: "info" | "ok" | "warn" }> = {
  pending: { label: "Pending — completes within 30 days", tone: "info" },
  completed: { label: "Completed", tone: "ok" },
  unknown: { label: "Unknown code", tone: "warn" },
  none: { label: "No record matched", tone: "warn" },
};

type Status = keyof typeof TERMINAL_STATES;

type DeletionRow = {
  requested_at: string;
  completed_at: string | null;
  source: string;
};

async function lookup(code: string | undefined): Promise<{
  status: Status;
  requestedAt?: string;
  completedAt?: string | null;
  source?: string;
}> {
  if (!code) return { status: "unknown" };
  if (code === "NONE") return { status: "none" };

  const admin = getSupabaseServiceRole();
  const { data: row } = await admin
    .from("deletion_requests")
    .select("requested_at, completed_at, source")
    .eq("confirmation_code", code)
    .returns<DeletionRow[]>()
    .maybeSingle();

  if (!row) return { status: "unknown" };
  return {
    status: row.completed_at ? "completed" : "pending",
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
    source: row.source,
  };
}

export default async function DataDeletionStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const result = await lookup(code);
  const meta = TERMINAL_STATES[result.status];

  return (
    <div className="min-h-screen relative z-10 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[520px] rounded-[14px] border border-border bg-surface card-base p-7">
        <div className="text-[11.5px] uppercase font-semibold text-muted tracking-wider mb-2">
          CreatorHub
        </div>
        <h1 className="text-[24px] font-semibold tracking-[-0.015em] text-text leading-tight">
          Data deletion status
        </h1>
        <p className="text-[13.5px] text-muted mt-2 leading-relaxed">
          We complete hard deletion within 30 days of a request. Audit log
          entries are retained (anonymized) for 12 months for security and
          dispute resolution.
        </p>

        <div
          className={
            "mt-6 rounded-[12px] border p-4 " +
            (meta.tone === "ok"
              ? "border-accent/30 bg-accent-soft"
              : meta.tone === "warn"
                ? "border-amber-500/30 bg-amber-500/10"
                : "border-border bg-surface-2")
          }
        >
          <div className="text-[11.5px] uppercase font-semibold text-muted tracking-wider mb-1">
            Status
          </div>
          <div className="text-[15px] font-semibold text-text">{meta.label}</div>

          {result.requestedAt && (
            <div className="text-[12.5px] text-muted mt-3">
              Requested:{" "}
              <span className="text-text font-medium">
                {new Date(result.requestedAt).toLocaleString()}
              </span>
            </div>
          )}
          {result.completedAt && (
            <div className="text-[12.5px] text-muted mt-1">
              Completed:{" "}
              <span className="text-text font-medium">
                {new Date(result.completedAt).toLocaleString()}
              </span>
            </div>
          )}
          {result.source && (
            <div className="text-[12.5px] text-muted mt-1">
              Source:{" "}
              <span className="text-text font-medium">
                {result.source === "meta_dsr"
                  ? "Meta data deletion request"
                  : "User-initiated via Settings"}
              </span>
            </div>
          )}
        </div>

        <p className="text-[11.5px] text-muted mt-5 leading-relaxed">
          If you didn&apos;t initiate this and need help, email{" "}
          <span className="text-text font-medium">support@creatorhub.app</span>.
        </p>
      </div>
    </div>
  );
}
