/**
 * Client-side helper for the editor "acting as" query param.
 *
 * Pages that re-scope to the active client just call:
 *   const q = useClientQuery();
 *   fetch(`/api/scripts${q}`)            // appends `?relationship_id=...` when set
 *   fetch(`/api/scripts?status=draft${q.amp}`)  // appends `&relationship_id=...`
 *
 * Returns "" when no client is active so the URLs stay clean for solo
 * creators / non-editor roles.
 */

import { useMemo } from "react";
import { useAppState } from "@/lib/store";

export type ClientQuery = {
  /** "?relationship_id=..." or "" */
  q: string;
  /** "&relationship_id=..." or "" — for URLs that already have a `?param`. */
  amp: string;
  /** Raw value (or null) for cases that need to build the URL themselves. */
  relationshipId: string | null;
};

export function useClientQuery(): ClientQuery {
  const { currentClient } = useAppState();
  return useMemo<ClientQuery>(() => {
    if (!currentClient) return { q: "", amp: "", relationshipId: null };
    const enc = encodeURIComponent(currentClient.relationshipId);
    return {
      q: `?relationship_id=${enc}`,
      amp: `&relationship_id=${enc}`,
      relationshipId: currentClient.relationshipId,
    };
  }, [currentClient]);
}
