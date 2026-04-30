/**
 * POST /api/assets/[id]/finalize
 *
 * Step 2 of the upload flow. The client calls this AFTER the bytes have
 * landed in Storage. We:
 *   - Verify the object exists at the expected path (defends against a
 *     client that forgot to actually upload).
 *   - For videos, enqueue a `jobs(kind='transcode')` row; the cron worker
 *     hands it to Cloudflare Stream and writes back `transcoded_variants`.
 *   - For photos, no-op — they're already 'playable' on insert.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type AssetRow = {
  id: string;
  user_id: string;
  kind: string;
  storage_key: string;
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: assetId } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: asset } = await supabase
    .from("assets")
    .select("id, user_id, kind, storage_key")
    .eq("id", assetId)
    .returns<AssetRow[]>()
    .maybeSingle();
  if (!asset) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  /* Confirm the bytes actually landed. Storage RLS limits the user to their
     own folder, so this is also an implicit ownership check. */
  const folder = asset.storage_key.split("/").slice(0, -1).join("/");
  const fileName = asset.storage_key.split("/").pop()!;
  const { data: list, error: listErr } = await supabase.storage
    .from("originals")
    .list(folder, { search: fileName, limit: 1 });
  if (listErr || !list || list.length === 0) {
    log.warn("assets.finalize.missing_object", {
      assetId,
      key: asset.storage_key,
    });
    return NextResponse.json({ error: "upload_missing" }, { status: 400 });
  }

  /* Lean video pipeline (free tier) — no Cloudflare Stream. We mark every
     uploaded video as playable immediately and serve the original from
     Supabase Storage via a short-lived signed URL on demand
     (/api/assets/[id]/playback-url). Trade-offs: bigger files, no adaptive
     bitrate, Supabase egress. Paid-tier upgrade path is to enqueue a
     transcode job here instead and let the Stream worker take over —
     `src/app/api/cron/run-jobs/route.ts` is dormant but still in tree. */
  const admin = getSupabaseServiceRole();
  const updateRow = {
    transcoded_variants: { ready_at: new Date().toISOString() },
  };
  const { error: updateErr } = await admin
    .from("assets")
    .update(updateRow as never)
    .eq("id", asset.id);
  if (updateErr) {
    log.error("assets.finalize.mark_ready_failed", updateErr);
    return NextResponse.json({ error: "mark_ready_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "ready" });
}
