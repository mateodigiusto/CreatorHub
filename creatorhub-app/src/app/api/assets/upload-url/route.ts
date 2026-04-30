/**
 * POST /api/assets/upload-url
 *
 * Step 1 of the upload flow. Client posts asset metadata and gets back:
 *   - assetId       — the row we just inserted (lifecycle: row exists, no bytes yet)
 *   - path          — Storage object key the client uploads to
 *   - token         — opaque signed-upload token (used with `uploadToSignedUrl`)
 *
 * The client then uses `supabase.storage.from('originals').uploadToSignedUrl(path, token, file)`
 * to upload the bytes directly — no proxying through our server.
 *
 * Storage RLS policies (migration 0013) enforce that path[1] === auth.uid(),
 * so a client can never write to another user's folder even with a token.
 */

import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type AssetKind = "photo" | "video" | "screenshot" | "testimonial" | "proof";

const ALLOWED_KINDS: AssetKind[] = ["photo", "video", "screenshot", "testimonial", "proof"];
const VIDEO_MAX_BYTES = 500 * 1024 * 1024; // 500 MB
const PHOTO_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  let body: {
    kind?: AssetKind;
    title?: string;
    mimeType?: string;
    sizeBytes?: number;
    durationSeconds?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.kind || !ALLOWED_KINDS.includes(body.kind)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }
  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "invalid_title" }, { status: 400 });
  }
  if (!body.mimeType || typeof body.mimeType !== "string") {
    return NextResponse.json({ error: "invalid_mime" }, { status: 400 });
  }
  if (typeof body.sizeBytes !== "number" || body.sizeBytes <= 0) {
    return NextResponse.json({ error: "invalid_size" }, { status: 400 });
  }

  const isVideo = body.kind === "video";
  const cap = isVideo ? VIDEO_MAX_BYTES : PHOTO_MAX_BYTES;
  if (body.sizeBytes > cap) {
    return NextResponse.json({ error: "too_large", limit: cap }, { status: 413 });
  }

  const assetId = randomUUID();
  /* Path layout matches the storage RLS policy: first segment is auth.uid(). */
  const ext = mimeToExt(body.mimeType) ?? "bin";
  const path = `${userId}/${assetId}/original.${ext}`;

  const { data: signed, error: signedErr } = await supabase.storage
    .from("originals")
    .createSignedUploadUrl(path);
  if (signedErr || !signed) {
    log.error("assets.upload_url.sign_failed", signedErr);
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }

  /* Insert via the user's RLS-scoped client.
     `as never` works around a known supabase-js typing bug — the generated
     types ship `PostgrestVersion: "14.5"` which 2.45 narrows to `never`. */
  const insertRow = {
    id: assetId,
    user_id: userId,
    kind: body.kind,
    title: body.title,
    storage_key: path,
    duration_seconds: body.durationSeconds ?? null,
    source: "upload",
    /* Photos have no transcoding step — they're playable on insert. Videos
       get null, which assetState() reads as 'processing' until the worker
       writes the variants. */
    transcoded_variants: isVideo ? null : { ready_at: new Date().toISOString() },
  };
  const { error: insertErr } = await supabase.from("assets").insert(insertRow as never);
  if (insertErr) {
    log.error("assets.upload_url.insert_failed", insertErr);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({
    assetId,
    path,
    token: signed.token,
    /* Direct PUT URL also returned in case the client wants to bypass the SDK. */
    signedUrl: signed.signedUrl,
  });
}

function mimeToExt(mime: string): string | null {
  const m = mime.toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  if (m === "image/heic") return "heic";
  if (m === "video/mp4") return "mp4";
  if (m === "video/quicktime") return "mov";
  if (m === "video/webm") return "webm";
  return null;
}
