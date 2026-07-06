/**
 * GET /api/assets
 *
 * Lists the authed user's assets with pre-baked signed URLs (1h TTL) so
 * tiles can render directly without one round-trip per asset. RLS scopes
 * the read to `user_id = auth.uid()`.
 *
 * Shape is the minimal one the Library tile needs — we don't expose
 * storage keys or transcoded_variants jsonb to the client.
 */

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const SIGNED_URL_TTL_S = 3600; // 1 hour

type AssetRow = {
  id: string;
  kind: string;
  title: string;
  storage_key: string;
  duration_seconds: number | null;
  transcoded_variants: { ready_at?: string; error?: string } | null;
  created_at: string;
};

export type ApiAsset = {
  id: string;
  kind: string;
  title: string;
  durationSeconds: number | null;
  state: "playable" | "processing" | "failed";
  signedUrl: string | null;
  createdAt: string;
};

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ assets: [] }, { status: 200 });
  }

  const { data: rows } = await supabase
    .from("assets")
    .select("id, kind, title, storage_key, duration_seconds, transcoded_variants, created_at")
    .order("created_at", { ascending: false })
    .returns<AssetRow[]>();

  if (!rows || rows.length === 0) {
    return NextResponse.json({ assets: [] });
  }

  /* Batch-sign every storage key in parallel. createSignedUrls returns one
     entry per path; failures don't blow the whole list. */
  const paths = rows.map((r) => r.storage_key);
  const { data: signed } = await supabase.storage
    .from("originals")
    .createSignedUrls(paths, SIGNED_URL_TTL_S);
  const urlByPath = new Map<string, string>();
  for (const s of signed ?? []) {
    if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl);
  }

  const assets: ApiAsset[] = rows.map((r) => {
    const v = r.transcoded_variants;
    const state: ApiAsset["state"] = v?.error
      ? "failed"
      : v?.ready_at
        ? "playable"
        : "processing";
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      durationSeconds: r.duration_seconds,
      state,
      signedUrl: state === "playable" ? urlByPath.get(r.storage_key) ?? null : null,
      createdAt: r.created_at,
    };
  });

  return NextResponse.json({ assets });
}
