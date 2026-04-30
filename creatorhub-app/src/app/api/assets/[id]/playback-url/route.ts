/**
 * GET /api/assets/[id]/playback-url
 *
 * Returns a short-lived signed URL of the asset's original file in Supabase
 * Storage. Used by `<VideoPlayer>` (and the Library photo grid) to render
 * media without proxying bytes through our server.
 *
 * RLS on `assets` enforces ownership — the supabase server client only
 * returns the row if it's the caller's. The path is auth-scoped (first
 * segment is user_id) so even if the URL leaked it would 403 outside the
 * TTL and the user's own session.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const SIGNED_URL_TTL_S = 3600; // 1 hour

export async function GET(
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
    .select("storage_key, transcoded_variants")
    .eq("id", assetId)
    .returns<Array<{ storage_key: string; transcoded_variants: { ready_at?: string } | null }>>()
    .maybeSingle();
  if (!asset) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!asset.transcoded_variants?.ready_at) {
    return NextResponse.json({ error: "not_ready" }, { status: 409 });
  }

  const { data: signed, error } = await supabase.storage
    .from("originals")
    .createSignedUrl(asset.storage_key, SIGNED_URL_TTL_S);
  if (error || !signed) {
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_S });
}
