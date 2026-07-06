/**
 * Next.js instrumentation hook — runs once per server process at boot.
 *
 * Two jobs:
 *   1. **Schema-version assertion.** Compare the embedded
 *      `EXPECTED_SCHEMA_VERSION` (set by CI from the highest migration
 *      number) against the live `schema_migrations.version` max. If
 *      mismatch, refuse to serve traffic. This stops a Vercel deploy
 *      that's ahead of prod's schema from booting.
 *   2. **Sentry binding.** Wire `log.error/warn` into Sentry so the
 *      logger captures everything from the very first request.
 *
 * Server + edge runtimes both call `register()` separately. We branch
 * on `process.env.NEXT_RUNTIME` because the edge runtime can't open a
 * Postgres connection.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await registerServer();
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await registerEdge();
  }
}

async function registerServer() {
  /* Initialize Sentry SDK first (no-op if SENTRY_DSN unset) so any errors
     in the schema check land in Sentry. */
  await import("./sentry.server.config");
  try {
    const Sentry = await import("@sentry/nextjs");
    const { bindSentry } = await import("@/lib/log");
    bindSentry({
      captureException: (err, ctx) =>
        Sentry.captureException(err, {
          extra: ctx?.extra as Record<string, unknown> | undefined,
        }),
      captureMessage: (msg, ctx) =>
        Sentry.captureMessage(msg, {
          level: ctx?.level ?? "info",
          extra: ctx?.extra as Record<string, unknown> | undefined,
        }),
    });
  } catch {
    /* Sentry not yet configured (Phase 1 boot before SENTRY_DSN exists).
       Logger still works — Sentry calls are no-ops by default. */
  }

  /* Schema-version assertion. */
  const expected = parseInt(process.env.EXPECTED_SCHEMA_VERSION ?? "", 10);
  if (!Number.isFinite(expected)) {
    /* CI normally sets this; in local dev with `supabase start` we don't
       require it — skip the check rather than refuse to boot. */
    if (process.env.NODE_ENV === "production") {
      const { log } = await import("@/lib/log");
      log.error("schema_version_unset", new Error("EXPECTED_SCHEMA_VERSION missing in prod build"));
    }
    return;
  }

  /* Skip the DB check in tests — vitest spins up many short-lived
     processes and we don't want to require a live Supabase per run. */
  if (process.env.NODE_ENV === "test") return;

  /* Read the live schema version. A transient boot-time DB error (cold-start
     connection blip, pool warm-up, brief pooler unavailability) must NOT take
     the whole app down — that would 500 every cold serverless instance. We
     only hard-refuse on a *confirmed* version mismatch, which is the real
     deploy-safety concern the assertion exists for. The request path has its
     own DB error handling. */
  let actual: number | null = null;
  try {
    const { dbInternal, schema } = await import("@/db");
    const { sql } = await import("drizzle-orm");
    const rows = await dbInternal.execute(
      sql`select max(version) as v from ${schema.schemaMigrations}`,
    );
    actual = (rows as unknown as Array<{ v: number | null }>)[0]?.v ?? null;
  } catch (err) {
    const { log } = await import("@/lib/log");
    log.warn("schema_version_check_unavailable", { error: String(err) });
    return;
  }

  if (actual === null) {
    const { log } = await import("@/lib/log");
    log.warn("schema_migrations_empty", {
      note: "no rows — run `npm run db:migrate`",
    });
    return;
  }

  if (actual !== expected) {
    const { log } = await import("@/lib/log");
    log.error(
      "schema_version_mismatch",
      new Error(
        `Code expects schema v${expected}, DB is v${actual}. ` +
          `Run prod migrations or roll back the deploy.`,
      ),
      { expected, actual },
    );
    /* Confirmed drift: refuse to serve in production; warn-and-continue in
       dev (the dev may be mid-migration). */
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Schema version mismatch: code expects v${expected}, DB is v${actual}.`,
      );
    }
  }
}

async function registerEdge() {
  /* Edge runtime: init + bind Sentry only. No DB check — edge can't open
     Postgres connections, and the server already enforces the assertion. */
  await import("./sentry.edge.config");
  try {
    const Sentry = await import("@sentry/nextjs");
    const { bindSentry } = await import("@/lib/log");
    bindSentry({
      captureException: (err, ctx) =>
        Sentry.captureException(err, {
          extra: ctx?.extra as Record<string, unknown> | undefined,
        }),
      captureMessage: (msg, ctx) =>
        Sentry.captureMessage(msg, {
          level: ctx?.level ?? "info",
          extra: ctx?.extra as Record<string, unknown> | undefined,
        }),
    });
  } catch {
    /* Same as server: pre-Sentry-config boots are fine. */
  }
}
