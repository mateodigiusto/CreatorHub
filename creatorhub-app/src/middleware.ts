/**
 * Next.js middleware — runs on every request that matches the matcher.
 *
 * Job for now: keep the Supabase session cookie fresh. We don't yet
 * gate routes by auth — that lands in Slice C when the (app)/ route
 * group splits off. For now the demo continues to work for anonymous
 * visitors; signed-in users get the cookie refreshed on each navigation.
 *
 * The matcher excludes static assets and Next internals so middleware
 * doesn't touch them.
 */

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(req: NextRequest) {
  return updateSession(req);
}

export const config = {
  matcher: [
    /* Skip Next internals + static files. The negative lookahead matches
       everything else, including / and all routes under /api. */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
