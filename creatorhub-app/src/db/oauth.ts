/**
 * OAuth state + PKCE helpers.
 *
 * Every connector (Instagram, TikTok, YouTube, LinkedIn, X, FB) goes through
 * these two functions so the security pattern stays uniform across platforms.
 *
 * Security invariants:
 *   1. State is cryptographically random — 32 bytes, base64url. Single-use.
 *   2. Atomic consume: a single UPDATE statement checks `state` + `consumed_at`
 *      + `expires_at` and returns the row, all in one round-trip. No race
 *      window between "is state valid?" and "mark it consumed."
 *   3. PKCE code_verifier is generated client-side intent (server-side here
 *      since OAuth callbacks come back to us) and stored as a SHA-256 hash —
 *      the raw verifier never persists in the DB.
 *   4. Expiry is short — 10 minutes. Long enough for the user to click the
 *      provider's "Authorize" button + redirect back; short enough to limit
 *      replay window.
 *
 * App Review reviewers test the atomic consume pattern against replay attacks
 * and expired-state attacks. Both collapse to "zero rows returned → reject."
 */

import { createHash, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { dbInternal } from "@/db";
import { log } from "@/lib/log";

const STATE_TTL_MINUTES = 10;

export type Platform = "instagram" | "tiktok" | "youtube" | "linkedin" | "x" | "facebook";

export type OAuthStartResult = {
  /** Send to provider as `state` query param. */
  state: string;
  /** Send to provider as `code_verifier` (PKCE only); we keep just the hash. */
  codeVerifier: string;
  /** Convenience: SHA-256(codeVerifier), base64url. Send as `code_challenge`. */
  codeChallenge: string;
};

export type OAuthConsumeResult = {
  userId: string;
  platform: Platform;
  codeVerifierHash: string | null;
  redirectUri: string;
};

/** Generate state + PKCE pair, persist hashed verifier server-side. */
export async function startOAuthFlow(params: {
  userId: string;
  platform: Platform;
  redirectUri: string;
}): Promise<OAuthStartResult> {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeVerifierHash = sha256B64Url(codeVerifier);
  const codeChallenge = codeVerifierHash; // S256 challenge IS sha256(verifier)
  const expiresAt = new Date(Date.now() + STATE_TTL_MINUTES * 60_000);

  await dbInternal.execute(sql`
    insert into oauth_states (state, user_id, platform, code_verifier_hash, redirect_uri, expires_at)
    values (${state}, ${params.userId}::uuid, ${params.platform}::platform_t,
            ${codeVerifierHash}, ${params.redirectUri}, ${expiresAt.toISOString()}::timestamptz)
  `);

  return { state, codeVerifier, codeChallenge };
}

/**
 * Atomic consume — one round-trip, no race window. Zero rows returned means
 * the state is invalid (never existed, already consumed, OR expired) and
 * the caller MUST reject. We deliberately don't distinguish the three cases
 * to limit information leakage to attackers probing the endpoint.
 */
export async function consumeOAuthState(state: string): Promise<OAuthConsumeResult | null> {
  if (!state || typeof state !== "string") return null;

  const rows = (await dbInternal.execute(sql`
    update oauth_states
    set consumed_at = now()
    where state = ${state}
      and consumed_at is null
      and expires_at > now()
    returning user_id, platform, code_verifier_hash, redirect_uri
  `)) as unknown as Array<{
    user_id: string;
    platform: Platform;
    code_verifier_hash: string | null;
    redirect_uri: string;
  }>;

  if (rows.length === 0) {
    log.warn("oauth.state.invalid", { state: state.slice(0, 8) + "…" });
    return null;
  }
  const r = rows[0];
  return {
    userId: r.user_id,
    platform: r.platform,
    codeVerifierHash: r.code_verifier_hash,
    redirectUri: r.redirect_uri,
  };
}

/**
 * After receiving the auth code from the provider, verify the original
 * code_verifier matches the hash we stored. Caller computes this against
 * the verifier from their own session/cookie store.
 */
export function verifyCodeVerifier(verifier: string, expectedHash: string): boolean {
  const actual = sha256B64Url(verifier);
  /* timing-safe comparison via length-equal byte buffers */
  if (actual.length !== expectedHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actual.length; i++) {
    mismatch |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return mismatch === 0;
}

function sha256B64Url(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}
