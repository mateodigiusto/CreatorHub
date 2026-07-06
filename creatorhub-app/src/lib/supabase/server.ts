/**
 * Server-side Supabase client.
 *
 * Use this in:
 *   - Server components (page.tsx, layout.tsx) under app/(app)/**
 *   - Request-bound API routes (app/api/** that have a session cookie)
 *
 * RLS is the security boundary — `auth.uid()` is set from the session
 * cookie, and policies on every user-owned table filter to that uid.
 *
 * Do NOT use this in:
 *   - Cron handlers (no session) — use forUser(userId) from src/db/forUser.ts
 *   - Webhook handlers — same
 *   - Auth-less public endpoints
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

type CookieItem = { name: string; value: string; options?: CookieOptions };

export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(items: CookieItem[]) {
          try {
            for (const { name, value, options } of items) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* setAll throws when called from a Server Component; safe to
               ignore — middleware refreshes session cookies. */
          }
        },
      },
    },
  );
}

/**
 * Resolve the current user id from the session, or `null` if unauthenticated.
 * Pages that require auth call this and redirect on null.
 */
export async function currentUserId(): Promise<string | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Service-role client. Bypasses RLS — use ONLY for writes that the user can't
 * make via their own session (service-role-only tables like `jobs`,
 * `webhook_events`, `oauth_states`). Always re-validate ownership against the
 * user's session-bound client BEFORE calling this.
 *
 * Lazy init so build-time page-data collection doesn't crash when env vars
 * are unset; same pattern as src/db/index.ts.
 */
let serviceRoleClient: ReturnType<typeof createClient<Database>> | null = null;
export function getSupabaseServiceRole() {
  if (!serviceRoleClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Service-role client requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    serviceRoleClient = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceRoleClient;
}
