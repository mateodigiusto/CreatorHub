/**
 * Vitest setup — loads .env.test (or .env.local) and asserts the cloud
 * Supabase project is reachable. Cloud-only setup; no local Docker stack.
 *
 * Required env (provided by Supabase project dashboard):
 *   - DATABASE_URL                  pgbouncer 6543, transaction mode
 *   - DIRECT_URL                    direct connection 5432 (DDL inspection)
 *   - NEXT_PUBLIC_SUPABASE_URL      https://<ref>.supabase.co
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Tests create disposable users with `@test.local` emails; clean them up
 * periodically from your Supabase auth dashboard.
 */

import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = existsSync(resolve(process.cwd(), ".env.test"))
  ? ".env.test"
  : ".env.local";
config({ path: resolve(process.cwd(), envFile) });

const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  throw new Error(
    `Missing env vars: ${missing.join(", ")}. ` +
      `Copy your cloud Supabase project values into .env.local — see .env.example.`,
  );
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL!.startsWith("https://")) {
  throw new Error(
    `NEXT_PUBLIC_SUPABASE_URL must be a cloud Supabase URL (https://<ref>.supabase.co). ` +
      `Got: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
  );
}
