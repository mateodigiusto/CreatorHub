/**
 * Meta Data-Deletion Request callback.
 *
 * Spec: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * Meta POSTs an x-www-form-urlencoded body with a single `signed_request` field.
 * We must:
 *   - Verify the HMAC signature against META_APP_SECRET.
 *   - Look up integrations matching the Meta user_id (Page-Scoped User ID).
 *   - For every match, schedule deletion (soft-delete user, queue hard-delete).
 *   - Synchronously return `{ url, confirmation_code }` so the user can check status.
 *
 * Returning 200 + a status URL is non-negotiable for App Review — Meta tests
 * this exact endpoint during review.
 *
 * Phase 1 note: integrations table is empty (Phase 2 wires Instagram). This
 * endpoint returns a "no record" confirmation in that case, which is the
 * spec-correct behavior.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { dbInternal, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";

type SignedRequestPayload = {
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
};

export async function POST(req: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    log.error("meta.dsr.no_app_secret", new Error("META_APP_SECRET unset"));
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const signedRequest = form?.get("signed_request");
  if (typeof signedRequest !== "string") {
    return NextResponse.json({ error: "missing_signed_request" }, { status: 400 });
  }

  const payload = parseSignedRequest(signedRequest, appSecret);
  if (!payload?.user_id) {
    return NextResponse.json({ error: "invalid_signed_request" }, { status: 400 });
  }

  const externalId = payload.user_id;
  const code = randomBytes(6).toString("hex");

  /* Find every integration matching this PSID. The partial-unique index
     `integrations_platform_external_active` (migration 0004) guarantees at
     most one ACTIVE row per (platform, external_id) — but inactive rows
     (revoked/expired/unsupported) can collide, so we look at all of them. */
  const matches = await dbInternal
    .select({ userId: schema.integrations.userId })
    .from(schema.integrations)
    .where(
      and(
        eq(schema.integrations.platform, "instagram"),
        eq(schema.integrations.externalAccountId, externalId),
      ),
    );

  if (matches.length === 0) {
    /* No record — Meta still requires a 200 with a confirmation URL. */
    log.warn("meta.dsr.no_match", { externalId: externalId.slice(0, 8) + "…" });
    return NextResponse.json({
      url: statusUrl(req, "none"),
      confirmation_code: "NONE",
    });
  }

  if (matches.length > 1) {
    log.warn("meta.dsr.multiple_matches", {
      matchCount: matches.length,
      externalId: externalId.slice(0, 8) + "…",
    });
  }

  /* Schedule deletion for every affected user. Single confirmation code
     covers the batch — the status page shows aggregate progress. */
  const userIds = [...new Set(matches.map((m) => m.userId))];
  await Promise.all(
    userIds.map(async (userId) => {
      await dbInternal.transaction(async (tx) => {
        await tx.insert(schema.deletionRequests).values({
          userId,
          source: "meta_dsr",
          confirmationCode: code,
          reason: "meta_data_deletion_request",
        });
        await tx
          .update(schema.users)
          .set({ deletedAt: new Date() })
          .where(eq(schema.users.id, userId));
        await tx
          .update(schema.integrations)
          .set({ status: "revoked", disconnectedAt: new Date() })
          .where(eq(schema.integrations.userId, userId));
      });
      await audit(userId, {
        actor: "webhook",
        action: "user.deletion_initiated",
        targetType: "user",
        targetId: userId,
        metadata: { source: "meta_dsr", confirmation_code: code },
      });
    }),
  );

  return NextResponse.json({
    url: statusUrl(req, code),
    confirmation_code: code,
  });
}

function statusUrl(req: NextRequest, code: string): string {
  const url = req.nextUrl.clone();
  url.pathname = "/data-deletion-status";
  url.search = `?code=${code}`;
  return url.toString();
}

/**
 * Verify Meta's signed_request format: `{base64url(sig)}.{base64url(payload)}`.
 * Sig is HMAC-SHA256 of the payload string using the app secret.
 * Returns the parsed payload, or null on any failure.
 */
function parseSignedRequest(
  signed: string,
  appSecret: string,
): SignedRequestPayload | null {
  const parts = signed.split(".");
  if (parts.length !== 2) return null;
  const [sigB64, payloadB64] = parts;

  let sig: Buffer;
  let payloadJson: string;
  try {
    sig = Buffer.from(sigB64.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    payloadJson = Buffer.from(
      payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
  } catch {
    return null;
  }

  const expected = createHmac("sha256", appSecret).update(payloadB64).digest();
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(sig, expected)) return null;

  try {
    const payload = JSON.parse(payloadJson) as SignedRequestPayload;
    if (payload.algorithm !== "HMAC-SHA256") return null;
    return payload;
  } catch {
    return null;
  }
}
