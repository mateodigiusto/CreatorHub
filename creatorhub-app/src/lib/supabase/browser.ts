/**
 * Client-side Supabase singleton.
 *
 * Used in:
 *   - "use client" components that need the user's session client-side
 *     (login UI subscribing to auth state, sign-out button, etc.)
 *   - Hooks like useUser() that need realtime auth updates
 *
 * Reads the same cookies the server reads, so server + client agree on
 * the session.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabaseBrowser() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
