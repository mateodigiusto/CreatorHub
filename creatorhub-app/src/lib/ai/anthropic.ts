/**
 * Server-only Anthropic SDK client.
 *
 * Uses dynamic `import()` so the rest of the build keeps compiling
 * before `npm i @anthropic-ai/sdk` runs (see
 * docs/plans/agency-clients-phase3-status.md §"Things Phase 3 intentionally
 * did NOT do"). At cutover, swap the dynamic import for:
 *
 *   import Anthropic from "@anthropic-ai/sdk";
 *
 * Model: claude-sonnet-4-6 per the agency plan §0 ("AI" row).
 */

import "server-only";

let cached: unknown | null = null;

export async function getAnthropic(): Promise<unknown> {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  // Dynamic import keeps `tsc` happy even if @anthropic-ai/sdk isn't
  // installed yet. Replace with a static import after cutover.
  const mod = (await import(/* webpackIgnore: true */ "@anthropic-ai/sdk" as string)) as {
    default: new (config: { apiKey: string }) => unknown;
  };
  const Anthropic = mod.default;
  cached = new Anthropic({ apiKey });
  return cached;
}

export const ANTHROPIC_MODEL = "claude-sonnet-4-6" as const;

/** Hard input cap — see §10 Risks ("Anthropic costs from long transcripts"). */
export const MAX_TRANSCRIPT_TOKENS = 25_000;

/** Rough char-to-token estimate for input gating before we hit the API. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}
