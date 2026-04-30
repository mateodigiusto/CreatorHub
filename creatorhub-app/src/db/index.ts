/**
 * Drizzle client for service-role / admin paths only.
 *
 * App code MUST NOT import `db` directly — use `forUser(userId)` from
 * ./forUser.ts. The `creatorhub/no-raw-db-import-in-app` ESLint rule blocks
 * raw imports under src/app/(app)/** and src/components/**.
 *
 * Pooling: DATABASE_URL points to Supabase pgbouncer on port 6543 in
 * transaction mode, which requires `prepare: false` on postgres-js. Direct
 * 5432 connections are reserved for migrations (`DIRECT_URL`).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url && process.env.NODE_ENV !== "test") {
  throw new Error(
    "DATABASE_URL is not set. Run `supabase start` and copy the pooler URL " +
      "(port 6543, transaction mode) into .env.local."
  );
}

const sql = postgres(url ?? "postgres://invalid", {
  /* Required for pgbouncer transaction-mode pooling. */
  prepare: false,
  /* Tight pool — Vercel functions are short-lived; keep connections lean. */
  max: 10,
  /* Reasonable timeouts for serverless. */
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Raw Drizzle handle. Internal use only — exported as `dbInternal` so a
 * grep on `db` in app code is unambiguous (always wrong).
 *
 * Authorized callers:
 *   - src/db/forUser.ts (the wrapper)
 *   - src/db/admin.ts (migration scripts)
 *   - tests/* (RLS suite, round-trip)
 *   - src/app/api/cron/** (background workers, with explicit forUser/escapeHatch)
 *   - src/app/api/webhooks/** (after HMAC verification)
 */
export const dbInternal = drizzle(sql, { schema });

export { schema };
export type DbInternal = typeof dbInternal;
