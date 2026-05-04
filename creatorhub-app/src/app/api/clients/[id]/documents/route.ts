/**
 * GET  /api/clients/[id]/documents — list shared docs (with metadata + signed URLs)
 * POST /api/clients/[id]/documents — attach an existing asset_id to this relationship
 *
 * The shared docs reuse `assets` rows (single bucket, single upload flow);
 * this endpoint adds/removes the join row in `relationship_documents` and
 * mints cross-user signed URLs server-side after membership check.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";

const SIGNED_URL_TTL_S = 3600;

type DocRow = {
  id: string;
  asset_id: string;
  shared_by: string;
  created_at: string;
};

type AssetRow = {
  id: string;
  user_id: string;
  kind: "photo" | "video" | "screenshot" | "testimonial" | "proof";
  title: string;
  storage_key: string;
  thumbnail_storage_key: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: docs } = await supabase
    .from("relationship_documents")
    .select("id, asset_id, shared_by, created_at")
    .eq("relationship_id", id)
    .order("created_at", { ascending: false })
    .returns<DocRow[]>();

  if (!docs || docs.length === 0) {
    return NextResponse.json({ documents: [] });
  }

  /* Pull asset metadata + signed URLs via service role. RLS would block
     cross-user reads of `assets`, but the user is a verified member of the
     relationship (RLS already gated the docs query above), so the service-role
     fetch is safe — we're fetching exactly the asset_ids they're allowed to see. */
  const admin = getSupabaseServiceRole();
  const assetIds = docs.map((d) => d.asset_id);
  const { data: assets } = await admin
    .from("assets")
    .select(
      "id, user_id, kind, title, storage_key, thumbnail_storage_key, duration_seconds, created_at",
    )
    .in("id", assetIds)
    .returns<AssetRow[]>();

  const assetById: Record<string, AssetRow> = Object.fromEntries(
    (assets ?? []).map((a) => [a.id, a]),
  );

  const documents = await Promise.all(
    docs.map(async (d) => {
      const a = assetById[d.asset_id];
      if (!a) return null;
      const { data: signed } = await admin.storage
        .from("originals")
        .createSignedUrl(a.storage_key, SIGNED_URL_TTL_S);
      return {
        id: d.id,
        assetId: a.id,
        sharedBy: d.shared_by,
        title: a.title,
        kind: a.kind,
        durationSeconds: a.duration_seconds,
        signedUrl: signed?.signedUrl ?? null,
        createdAt: d.created_at,
      };
    }),
  );

  return NextResponse.json({
    documents: documents.filter((d) => d !== null),
  });
}

type PostBody = { assetId?: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const assetId = body.assetId;
  if (!assetId) {
    return NextResponse.json({ error: "asset_id_required" }, { status: 400 });
  }

  /* Verify the user owns the asset (asset RLS handles this). */
  const { data: asset } = await supabase
    .from("assets")
    .select("id")
    .eq("id", assetId)
    .returns<Array<{ id: string }>>()
    .maybeSingle();
  if (!asset) {
    return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("relationship_documents")
    .insert({
      relationship_id: id,
      asset_id: assetId,
      shared_by: userRes.user.id,
    } as never)
    .select("id")
    .returns<Array<{ id: string }>>()
    .single();
  if (error || !data) {
    if (error?.message.includes("duplicate")) {
      return NextResponse.json({ error: "already_shared" }, { status: 409 });
    }
    log.error("clients.doc_attach_failed", error ?? new Error("no row"));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, ok: true });
}
