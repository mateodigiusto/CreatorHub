/**
 * Phase 2 dependency re-export — single seam between Phase 7 (the
 * /workspace/* portal) and Phase 2's `src/lib/agency/types.ts`.
 *
 * Phase 7 was built in parallel; this shim originally inlined the types
 * verbatim from migration 0034. Phase 2 has now landed, so the shim is a
 * thin re-export.
 */

export { type Client, type ClientStatus, type ClientAccessRole } from "./types";
