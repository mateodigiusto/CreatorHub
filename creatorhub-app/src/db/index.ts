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

type DrizzleHandle = ReturnType<typeof drizzle<typeof schema>>;

let cachedDb: DrizzleHandle | null = null;

/* Resolve + validate DATABASE_URL on first use, not at module load. Eager
   parsing breaks `next build` page-data collection when DATABASE_URL is
   unset or still a `<ref>:<password>` placeholder — postgres-js parses the
   URL with `new URL(...)` which throws `ERR_INVALID_URL` synchronously. */
function getDb(): DrizzleHandle {
  if (cachedDb) return cachedDb;
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("<")) {
    throw new Error(
      "DATABASE_URL is not set or still has placeholders. " +
        "Copy your Supabase Transaction-pooler URL (port 6543) into .env.local.",
    );
  }
  const sql = postgres(url, {
    /* Required for pgbouncer transaction-mode pooling. */
    prepare: false,
    /* Tight pool — Vercel functions are short-lived; keep connections lean. */
    max: 10,
    /* Reasonable timeouts for serverless. */
    idle_timeout: 20,
    connect_timeout: 10,
  });
  cachedDb = drizzle(sql, { schema });
  return cachedDb;
}

/**
 * Raw Drizzle handle. Internal use only — exported as `dbInternal` so a
 * grep on `db` in app code is unambiguous (always wrong).
 *
 * Method calls are forwarded to the lazily-initialized real handle.
 *
 * Authorized callers:
 *   - src/db/forUser.ts (the wrapper)
 *   - src/db/admin.ts (migration scripts)
 *   - tests/* (RLS suite, round-trip)
 *   - src/app/api/cron/** (background workers, with explicit forUser/escapeHatch)
 *   - src/app/api/webhooks/** (after HMAC verification)
 */
export const dbInternal = new Proxy({} as DrizzleHandle, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
export type DbInternal = DrizzleHandle;
