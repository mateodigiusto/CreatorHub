/**
 * Active-org cookie helper for multi-org-per-user (Phase 9).
 *
 * `getSession()` (src/lib/auth/session.ts) owns the actual resolution —
 * cookie hit → that org; cookie missing/stale → the user's first
 * membership. This module just reads + validates the cookie so a
 * malformed value behaves identically to no cookie at all.
 */

import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE } from "./types";

/** Lowercase/uppercase hex UUID, the only shape we ever write. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Read the active-org cookie. Returns the UUID string, or null when the
 * cookie is absent OR holds anything that isn't a UUID — a clipped /
 * tampered / legacy value resolves like "no cookie" instead of erroring
 * a `uuid`-typed query every request.
 */
export async function getActiveOrgIdFromCookie(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(ACTIVE_ORG_COOKIE)?.value;
  return raw && UUID_RE.test(raw) ? raw : null;
}
