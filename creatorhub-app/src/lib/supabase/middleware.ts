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

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

type CookieItem = { name: string; value: string; options?: CookieOptions };

/* Pages anyone can visit without a session. Everything else under the
   matcher requires auth. API routes are excluded from gating here — they
   enforce their own auth via getUser() and return 401 to keep the response
   shape correct for API clients (no surprise 302 redirects). */
const PUBLIC_PAGES = new Set([
  "/",
  "/login",
  "/onboarding",
  "/terms",
  "/privacy",
  "/data-deletion-status",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGES.has(pathname)) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/onboarding/")) return true;
  /* Join screens must be reachable while signed out — the page itself
     handles auth, redirecting to /login?next=<join-url> so the invitee
     lands back here after signing in. Gating them in middleware would
     strip the `next` param and break the invite flow. */
  if (pathname.startsWith("/join/")) return true;
  if (pathname.startsWith("/join-org/")) return true;
  return false;
}

export async function updateSession(req: NextRequest): Promise<NextResponse> {
  /* Local UI-preview escape hatch. When PREVIEW_NO_AUTH=1 (set only in
     .env.local), skip Supabase entirely so every screen renders without a
     backend. Never set in production. */
  if (process.env.PREVIEW_NO_AUTH === "1") {
    return NextResponse.next({ request: req });
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(items: CookieItem[]) {
          for (const { name, value } of items) {
            req.cookies.set(name, value);
          }
          res = NextResponse.next({ request: req });
          for (const { name, value, options } of items) {
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  /* IMPORTANT: validates with the Supabase auth server. Don't replace with
     getSession() — that trusts whatever's in the cookie. */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(req.nextUrl.pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}
