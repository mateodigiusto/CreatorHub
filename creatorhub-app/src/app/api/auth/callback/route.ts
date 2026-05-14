/**
 * OAuth + magic-link callback handler.
 *
 * The login UI calls `signInWithOtp({ emailRedirectTo: '/api/auth/callback' })`
 * or `signInWithOAuth({ redirectTo: '/api/auth/callback' })`. Supabase's
 * email server / OAuth provider sends the user back here with a `code`
 * query param. We exchange it for a session cookie and redirect on.
 *
 * Errors land on /login?error=... so the user sees something — they don't
 * see a 4xx page.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveUserContext, destinationFor } from "@/lib/auth/user-context";
import { log } from "@/lib/log";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  /* Explicit deep-link target, if the magic link / OAuth carried one. When
     absent we route by account track instead of defaulting to /dashboard. */
  const next = url.searchParams.get("next") ?? "";
  const error = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");
  const errorDescription = url.searchParams.get("error_description");

  /* Provider-side errors. Supabase returns `error=access_denied` for two very
     different cases — distinguish them so we show the right copy:
       - `error_code=otp_expired` → magic link expired or was already used
       - bare `access_denied`     → user clicked "Cancel" in OAuth consent */
  if (error) {
    log.warn("auth.callback.provider_error", { error, errorCode, errorDescription });
    const userFacing = errorCode === "otp_expired" ? "exchange_failed" : error;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(userFacing)}`, url.origin),
    );
  }

  if (!code) {
    log.warn("auth.callback.missing_code", { url: url.pathname });
    return NextResponse.redirect(
      new URL("/login?error=missing_code", url.origin),
    );
  }

  const supabase = await getSupabaseServer();
  const { data: exchangeData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    log.error("auth.callback.exchange_failed", exchangeError);
    return NextResponse.redirect(
      new URL("/login?error=exchange_failed", url.origin),
    );
  }

  const userId = exchangeData.session?.user.id;
  if (userId) {
    /* Soft-deleted accounts can't log back in. Sign out + bounce to /login. */
    const { data: userRow } = await supabase
      .from("users")
      .select("deleted_at")
      .eq("id", userId)
      .returns<Array<{ deleted_at: string | null }>>()
      .maybeSingle();
    if (userRow?.deleted_at) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/login?error=account_deleted", url.origin),
      );
    }

    /* A join link routes through here as `?next=/join/<token>`. The redeemer
       has no membership yet, so track-routing would send them to /onboarding
       — but they need to land on /join to redeem the invite. Honor any
       /join/* next verbatim before track-routing kicks in. */
    const isJoinNext = next.startsWith("/join/");
    if (isJoinNext) {
      return NextResponse.redirect(new URL(next, url.origin));
    }

    /* Route by account track. needs-onboarding wins over any `?next`
       (finishing setup takes priority); everyone else honors a safe `next`
       deep-link, falling back to their track's home. */
    const ctx = await resolveUserContext();
    if (ctx.type === "needs-onboarding") {
      return NextResponse.redirect(new URL("/onboarding", url.origin));
    }
    const safeNext =
      next.startsWith("/") && !next.startsWith("//")
        ? next
        : destinationFor(ctx);
    return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  /* No userId on the exchanged session — degenerate case; bounce home and
     let the root gate sort it out. */
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
