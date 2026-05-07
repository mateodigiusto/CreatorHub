/**
 * Authorization helper for editor-mode client switching.
 *
 * When an editor switches into a client's workspace from the Topbar, every
 * API route that respects the switch must verify the editor still has an
 * active relationship to that target user before returning their data.
 *
 * Usage from a route handler that has already resolved the editor's auth:
 *
 *   const ok = await assertActiveRelationship(editorId, clientId);
 *   if (!ok) return NextResponse.json({ error: "no_relationship" }, { status: 403 });
 *   // …then `forUser(clientId)` (with a justified escape hatch comment) for the rest of the request.
 *
 * Returns true only when there is a row with:
 *   manager_id = editorId, creator_id = clientId, status = 'active'.
 *
 * Editor switching to themselves (clientId === editorId) is always allowed
 * — the "My workspace" option in the dropdown maps to a no-op switch.
 *
 * Uses the Supabase server client so RLS enforces the read at the DB
 * boundary. The editor's own `creator_relationships` rows are visible to
 * them; rows for other managers are not.
 */

import { getSupabaseServer } from "@/lib/supabase/server";

export async function assertActiveRelationship(
  editorId: string,
  clientId: string,
): Promise<boolean> {
  if (editorId === clientId) return true;
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("creator_relationships")
    .select("id")
    .eq("manager_id", editorId)
    .eq("creator_id", clientId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}
