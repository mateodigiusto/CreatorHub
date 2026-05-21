/**
 * Active-org resolution for multi-org-per-user (Phase 9).
 *
 * `resolveActiveOrgId()` is the single decision point for "which org is
 * this request acting on?":
 *
 *   1. Read the `creatorhub-active-org` cookie.
 *   2. If set, verify the user still has a membership for that org. If
 *      they do → that's the active org.
 *   3. If the cookie is absent, or points at an org the user was removed
 *      from, fall back to the user's first membership (created_at asc) —
 *      exactly the pre-Phase-9 behavior, so single-org users are
 *      unaffected and stale cookies self-heal.
 *
 * The cookie is only ever *set* by POST /api/organizations/switch (and
 * create-additional). This module just reads + resolves.
 */

import { cookies } from "next/headers";
import type { getSupabaseServer } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "./types";

type ServerSupabase = Awaited<ReturnType<typeof getSupabaseServer>>;

/** Read the raw cookie value (UUID string) or null. */
export async function getActiveOrgIdFromCookie(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(ACTIVE_ORG_COOKIE)?.value;
  return raw && raw.length > 0 ? raw : null;
}

/**
 * Resolve the org id this request should act on. Returns null only when
 * the user has no memberships at all.
 */
export async function resolveActiveOrgId(args: {
  supabase: ServerSupabase;
  userId: string;
}): Promise<string | null> {
  const { supabase, userId } = args;

  const cookieOrgId = await getActiveOrgIdFromCookie();
  if (cookieOrgId) {
    /* Re-verify membership every request — an admin may have removed the
       user since the cookie was set. RLS already scopes to self, but we
       filter explicitly so the check is obvious. */
    const { data } = await supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("profile_id", userId)
      .eq("organization_id", cookieOrgId)
      .maybeSingle();
    if (data) return cookieOrgId;
    /* Stale cookie — fall through to the first-membership fallback. The
       cookie gets overwritten by the next /switch call. */
  }

  const { data: first } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("profile_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (first as { organization_id: string } | null)?.organization_id ?? null;
}
