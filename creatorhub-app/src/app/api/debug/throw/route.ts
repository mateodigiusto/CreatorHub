/**
 * Sentry verification endpoint — production-safe smoke test.
 *
 * Hit `GET /api/debug/throw?secret=$CRON_SECRET` to:
 *   1. Emit a `log.error()` (verifies the bound `bindSentry()` path).
 *   2. Throw an unhandled error (verifies the @sentry/nextjs route-handler
 *      auto-capture).
 *
 * Both events should land in Sentry within 60s with redacted breadcrumbs.
 *
 * Gated behind `CRON_SECRET` (same secret cron uses) so randos can't
 * trigger noise. If the secret is unset (local dev without `.env.local`),
 * we 503 rather than throw — no point spamming Sentry from dev.
 *
 * Remove this route once Sentry is verified in production. Or leave it —
 * it's a useful "is monitoring still alive?" canary.
 */

import { NextResponse, type NextRequest } from "next/server";
import { log } from "@/lib/log";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured — cannot run debug throw safely" },
      { status: 503 },
    );
  }

  const provided = req.nextUrl.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /* Path 1: bound `log.error` → bindSentry → Sentry.captureException */
  log.error(
    "sentry.debug_throw.log_error_path",
    new Error("Sentry verification (log path)"),
    { source: "manual_test", path: "log.error" },
  );

  /* Path 2: unhandled throw → Next.js route handler auto-capture by
     @sentry/nextjs. Comment out one or the other if testing in isolation. */
  throw new Error("Sentry verification (throw path) — please ignore");
}
