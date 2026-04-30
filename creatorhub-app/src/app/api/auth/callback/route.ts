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
import { log } from "@/lib/log";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
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

    /* First-time-vs-returning gate. Profile rows only get a `completed_at`
       when the wizard finishes — so a missing row OR a null timestamp both
       mean "send them to onboarding." Forces onboarding even if the magic
       link had `?next=/somewhere` — finishing the wizard takes priority. */
    const { data: profile } = await supabase
      .from("profiles")
      .select("completed_at")
      .eq("user_id", userId)
      .returns<Array<{ completed_at: string | null }>>()
      .maybeSingle();

    if (!profile?.completed_at) {
      return NextResponse.redirect(new URL("/onboarding", url.origin));
    }
  }

  /* `next` is a same-origin redirect target; reject anything else to
     prevent open-redirect abuse. */
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
