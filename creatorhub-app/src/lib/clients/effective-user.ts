/**
 * Editor "act-as-client" resolution.
 *
 * When an editor has the ClientSwitcher set, every API route that reads
 * or writes user-scoped data passes `?relationship_id=<id>` from the
 * client. This helper:
 *
 *   1. If no relationship_id is present, returns { userId: editorId }.
 *   2. If present, verifies via the editor's RLS-scoped session that the
 *      relationship is theirs AND active, then returns the counterparty's
 *      user_id. The caller uses this id with the SERVICE-ROLE client to
 *      query/write the client's data (bypassing RLS — the membership
 *      check we just did IS the security boundary).
 *   3. Returns an error tuple on missing relationship / not-active /
 *      not-the-manager-side, which the caller forwards as a 403.
 *
 * Why use the editor's session for the check, not service role:
 *   - The editor's session honors the v18 RLS on creator_relationships,
 *     so we can't accidentally grant access to a relationship the editor
 *     doesn't own.
 *   - Once the membership is proven, the service-role read of the
 *     CLIENT's data is intentional cross-user access — the relationship
 *     IS the consent.
 */

import {
  type getSupabaseServer,
  getSupabaseServiceRole,
} from "@/lib/supabase/server";

/* The full SupabaseClient generic shape varies between supabase-js
   versions; pin the helper signature to whatever getSupabaseServer
   currently returns so the call sites don't need casts. */
type ServerSupabase = Awaited<ReturnType<typeof getSupabaseServer>>;
type ServiceSupabase = ReturnType<typeof getSupabaseServiceRole>;

export type EffectiveUser =
  | { ok: true; userId: string; isClient: boolean }
  | { ok: false; error: string; status: number };

/** Returns the right Supabase client for the effective-user resolution.
 *  Solo / own-mode → editor's session-bound client (RLS does isolation).
 *  Client-acting mode → service-role client (membership check IS isolation).
 *
 *  Returned as ServiceSupabase to give the call site a single concrete
 *  type — supabase-js's typed builder rejects unions between the two
 *  client factories' generics. The cast is safe: both clients implement
 *  the identical PostgREST surface; only the generic parameters differ. */
export function readerFor(
  supabase: ServerSupabase,
  isClient: boolean,
): ServiceSupabase {
  if (isClient) return getSupabaseServiceRole();
  return supabase as unknown as ServiceSupabase;
}

export async function resolveEffectiveUser(
  supabase: ServerSupabase,
  editorId: string,
  relationshipId: string | null,
): Promise<EffectiveUser> {
  if (!relationshipId) {
    return { ok: true, userId: editorId, isClient: false };
  }

  const { data, error } = await supabase
    .from("creator_relationships")
    .select("creator_id, status")
    .eq("id", relationshipId)
    .eq("manager_id", editorId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "no_relationship", status: 403 };
  }
  type RelRow = { creator_id: string | null; status: string };
  const rel = data as RelRow;
  if (rel.status !== "active") {
    return { ok: false, error: "relationship_not_active", status: 403 };
  }
  if (!rel.creator_id) {
    /* Pending invite — counterparty hasn't signed up yet, no user_id. */
    return { ok: false, error: "client_not_active", status: 403 };
  }

  return { ok: true, userId: rel.creator_id, isClient: true };
}
