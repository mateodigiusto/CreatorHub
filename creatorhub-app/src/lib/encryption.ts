/**
 * Envelope encryption for OAuth tokens.
 *
 *   ┌─────────┐    ┌─────────┐    ┌──────────────┐
 *   │  KEK    │ ── encrypts ── │  per-row DEK │ ── encrypts ── plaintext
 *   └─────────┘    └─────────┘    └──────────────┘
 *      (Vault)                      (random / row)
 *
 * Why envelope:
 *   - KEK rotation doesn't require re-encrypting every token: we just
 *     re-encrypt each row's DEK with the new KEK. Cheap.
 *   - DEK is unique per row, so a leaked single token doesn't help an
 *     attacker decrypt others.
 *
 * Storage layout:
 *   integrations.access_token_ciphertext  — IV(12) + ct + tag(16)
 *   integrations.access_token_dek         — IV(12) + encrypted DEK(32) + tag(16)  = 60 bytes
 *   integrations.access_token_key_id      — text label of which KEK was used
 *
 * Key sourcing:
 *   - Production: KEK lives in Supabase Vault (`vault.secrets`); we look it
 *     up by `SUPABASE_VAULT_KEY_ID`. Vault swap point is below — left as a
 *     stub until Phase 2 wires the real Vault read.
 *   - Dev / fallback: KEK comes from `ENCRYPTION_KEY` env var, base64url
 *     of 32 bytes. Generate with: `openssl rand -base64 32`.
 *
 * Algorithms:
 *   - AES-256-GCM both layers. Authenticated encryption — tampering is
 *     caught at decrypt time (auth tag mismatch → throw).
 *   - 12-byte random IV per encrypt (NIST recommended for GCM).
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCMTypes,
} from "node:crypto";

const ALGO: CipherGCMTypes = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const DEK_BYTES = 32; // 256 bits

export type EnvelopeCiphertext = {
  /** IV(12) + ciphertext + tag(16) */
  ciphertext: Buffer;
  /** IV(12) + encrypted DEK(32) + tag(16) — always 60 bytes */
  dek: Buffer;
  /** Which KEK identity encrypted the DEK; lets us decrypt across rotations. */
  keyId: string;
};

/**
 * Resolve the active KEK. Returns the 32-byte key + an identifier.
 *
 * Phase 1 dev path: read from ENCRYPTION_KEY env. Phase 2+ swap to Vault:
 *   const { data } = await admin.from('vault.secrets').select('decrypted_secret')
 *     .eq('id', process.env.SUPABASE_VAULT_KEY_ID).single();
 */
function getActiveKek(): { key: Buffer; keyId: string } {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY not set. Generate one with `openssl rand -base64 32` and add to .env.local.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). ` +
        `Use base64-encoded 32 bytes.`,
    );
  }
  /* keyId tracks the bootstrap secret name when on env; in Vault mode this
     becomes the Vault secret id. Stored on every row so rotation is just
     "swap the env / Vault secret + add the new key_id label." */
  return { key, keyId: "env:v1" };
}

/**
 * Resolve a KEK by id (for decryption of older rows after rotation).
 * Phase 1: only one KEK exists. Phase 2+ adds a registry: env:v1, env:v2,
 * vault:abc-123, etc.
 */
function getKekById(keyId: string): Buffer {
  if (keyId !== "env:v1") {
    throw new Error(`Unknown KEK keyId: ${keyId}. Add to registry before reading rows.`);
  }
  return getActiveKek().key;
}

/** Encrypt arbitrary string plaintext under a fresh DEK + the active KEK. */
export function encrypt(plaintext: string): EnvelopeCiphertext {
  const { key: kek, keyId } = getActiveKek();
  const dek = randomBytes(DEK_BYTES);

  const ciphertext = aesEncrypt(dek, Buffer.from(plaintext, "utf8"));
  const wrappedDek = aesEncrypt(kek, dek);

  return { ciphertext, dek: wrappedDek, keyId };
}

/** Inverse — recover the plaintext. Throws on auth-tag mismatch (tampering). */
export function decrypt(env: EnvelopeCiphertext): string {
  const kek = getKekById(env.keyId);
  const dek = aesDecrypt(kek, env.dek);
  if (dek.length !== DEK_BYTES) {
    throw new Error(`Unwrapped DEK has wrong length: ${dek.length}`);
  }
  const plaintext = aesDecrypt(dek, env.ciphertext);
  return plaintext.toString("utf8");
}

function aesEncrypt(key: Buffer, plaintext: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]);
}

function aesDecrypt(key: Buffer, packed: Buffer): Buffer {
  if (packed.length < IV_BYTES + TAG_BYTES) {
    throw new Error("Ciphertext too short");
  }
  const iv = packed.subarray(0, IV_BYTES);
  const tag = packed.subarray(packed.length - TAG_BYTES);
  const ct = packed.subarray(IV_BYTES, packed.length - TAG_BYTES);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}
