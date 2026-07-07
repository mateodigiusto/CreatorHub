/**
 * Supabase SSR session refresh — runs on every request via Next.js middleware.
 *
 * The pattern (from @supabase/ssr docs): build a server client whose cookies
 * adapter writes Set-Cookie headers on the response, then call `getUser()`
 * which validates the session against Supabase's auth server and bumps any
 * cookies that need refreshing.
 *
 * `getUser()` is preferred over `getSession()` because it actually contacts
 * Supabase — `getSession()` trusts whatever's in the cookie, which is unsafe.
 *
 * Edge-runtime safe: postgres-js is never imported here.
 */

import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(req: NextRequest): Promise<NextResponse> {
  /* Auth gate disabled: the login wall is turned off app-wide, so every
     request passes through without a Supabase session. */
  return NextResponse.next({ request: req });
}
