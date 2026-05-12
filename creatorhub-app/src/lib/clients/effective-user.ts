/**
 * Editor "act-as-client" resolution — Phase 1 stub.
 *
 * The legacy relationship-based model is dropped (see docs/plans/agency-clients-module.md).
 * The new agency model resolves "current client" by URL slug (/clients/[slug]/*)
 * instead of a query-param + relationship_id. Until the agency-side scripts /
 * content-dna surfaces are wired up, this helper always falls back to "no
 * acting-as" — every caller operates on their own data.
 *
 * Phase 7 wires this back up against client_memberships.
 */

import {
  type getSupabaseServer,
  getSupabaseServiceRole,
} from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof getSupabaseServer>>;
type ServiceSupabase = ReturnType<typeof getSupabaseServiceRole>;

export type EffectiveUser =
  | { ok: true; userId: string; isClient: boolean }
  | { ok: false; error: string; status: number };

export function readerFor(
  supabase: ServerSupabase,
  isClient: boolean,
): ServiceSupabase {
  if (isClient) return getSupabaseServiceRole();
  return supabase as unknown as ServiceSupabase;
}

export async function resolveEffectiveUser(
  _supabase: ServerSupabase,
  editorId: string,
  _relationshipId: string | null,
): Promise<EffectiveUser> {
  return { ok: true, userId: editorId, isClient: false };
}
