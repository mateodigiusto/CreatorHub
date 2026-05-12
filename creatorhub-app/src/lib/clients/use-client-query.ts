/**
 * Client-side helper — Phase 1 stub.
 *
 * The legacy relationship model is gone (see docs/plans/agency-clients-module.md).
 * Scripts / content-dna pages still call this; until they're rewritten against
 * the new agency model (client_memberships, /clients/[slug]/*), this just
 * returns empty so URLs stay unscoped.
 */

export type ClientQuery = {
  /** "?relationship_id=..." or "" */
  q: string;
  /** "&relationship_id=..." or "" — for URLs that already have a `?param`. */
  amp: string;
  /** Raw value (or null). Always null in this stub. */
  relationshipId: string | null;
};

export function useClientQuery(): ClientQuery {
  return { q: "", amp: "", relationshipId: null };
}
