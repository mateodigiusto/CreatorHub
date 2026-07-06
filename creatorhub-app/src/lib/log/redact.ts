/**
 * Single source of truth for redaction. Used by:
 *   - src/lib/log/index.ts (the redactedLogger)
 *   - sentry.{client,server,edge}.config.ts (Sentry beforeSend hooks)
 *
 * Adding a new sensitive key here updates both consumers.
 */

export const REDACT_KEYS: ReadonlySet<string> = new Set([
  /* Tokens + secrets */
  "access_token",
  "accessToken",
  "refresh_token",
  "refreshToken",
  "client_secret",
  "clientSecret",
  "password",
  "secret",
  "api_key",
  "apiKey",
  /* HTTP auth headers */
  "authorization",
  "cookie",
  "set-cookie",
  /* OAuth flow secrets */
  "code_verifier",
  "codeVerifier",
  "state",
  /* Encryption material */
  "access_token_ciphertext",
  "accessTokenCiphertext",
  "access_token_dek",
  "accessTokenDek",
  "refresh_token_ciphertext",
  "refreshTokenCiphertext",
  "refresh_token_dek",
  "refreshTokenDek",
  /* User PII */
  "email",
  "phone",
  "ip",
  "session",
]);

const REDACTED = "[REDACTED]";

/**
 * Deep-walks an object/array, returns a redacted copy. Original is never
 * mutated. Cycles are handled (a previously-seen ref renders as
 * "[Circular]"). Stops at depth 8 to avoid pathological inputs.
 */
export function redact(value: unknown, depth = 0, seen = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 8) return "[depth-limit]";
  if (typeof value !== "object") return value;

  /* Special objects we don't recurse into. */
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (typeof Buffer !== "undefined" && value instanceof Buffer) return "[Buffer]";

  if (seen.has(value as object)) return "[Circular]";
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEYS.has(k) || REDACT_KEYS.has(k.toLowerCase())) {
      out[k] = REDACTED;
    } else {
      out[k] = redact(v, depth + 1, seen);
    }
  }
  return out;
}
