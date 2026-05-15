/**
 * GET   /api/clients/[slug]/assets/links — list, narrow by ?folderId / ?category
 * POST  /api/clients/[slug]/assets/links — create
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getAgencySession,
  requireClientAccess,
  requireOrgRole,
  HttpError,
  httpErrorResponse,
} from "@/lib/agency/phase5-deps";
import {
  ASSET_CATEGORIES,
  type AssetCategory,
  type AssetLink,
  type Visibility,
} from "@/lib/agency/assets-types";

type Params = { params: Promise<{ slug: string }> };

type DbRow = {
  id: string;
  organization_id: string;
  client_id: string;
  folder_id: string | null;
  title: string;
  url: string;
  category: AssetCategory;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
};

function toLink(row: DbRow): AssetLink {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    folderId: row.folder_id,
    title: row.title,
    url: row.url,
    category: row.category,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    const client = await requireClientAccess(slug);
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const category = searchParams.get("category");
    const supabase = await getSupabaseServer();
    let q = supabase.from("asset_links").select("*").eq("client_id", client.id);
    if (folderId) q = q.eq("folder_id", folderId);
    if (category && (ASSET_CATEGORIES as readonly string[]).includes(category)) {
      q = q.eq("category", category);
    }
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .returns<DbRow[]>();
    if (error) throw new HttpError(500, "db_read_failed");
    return NextResponse.json({ links: (data ?? []).map(toLink) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    requireOrgRole(session, ["user", "editor", "director"]);
    const client = await requireClientAccess(slug);

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      throw new HttpError(400, "invalid_json");
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!title) throw new HttpError(400, "title_required");
    if (!url) throw new HttpError(400, "url_required");
    try {
      new URL(url);
    } catch {
      throw new HttpError(400, "url_invalid");
    }

    const category: AssetCategory =
      typeof body.category === "string" &&
      (ASSET_CATEGORIES as readonly string[]).includes(body.category)
        ? (body.category as AssetCategory)
        : "other";
    const visibility: Visibility =
      body.visibility === "client_visible" ? "client_visible" : "internal";
    const folderId =
      typeof body.folderId === "string" && body.folderId.length > 0
        ? body.folderId
        : null;

    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("asset_links")
      .insert({
        client_id: client.id,
        organization_id: client.organizationId,
        folder_id: folderId,
        title: title.slice(0, 200),
        url,
        category,
        visibility,
        created_by: session.userId,
      } as never)
      .select("*")
      .single()
      .returns<DbRow>();
    if (error || !data) throw new HttpError(500, "db_write_failed");
    return NextResponse.json({ link: toLink(data) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
