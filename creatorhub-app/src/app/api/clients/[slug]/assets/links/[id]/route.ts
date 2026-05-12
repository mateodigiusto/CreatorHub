/**
 * PATCH  /api/clients/[slug]/assets/links/[id]
 * DELETE /api/clients/[slug]/assets/links/[id]
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
  type Visibility,
} from "@/lib/agency/assets-types";

type Params = { params: Promise<{ slug: string; id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
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

    const updates: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) {
      updates.title = body.title.trim().slice(0, 200);
    }
    if (typeof body.url === "string" && body.url.trim()) {
      try {
        new URL(body.url.trim());
      } catch {
        throw new HttpError(400, "url_invalid");
      }
      updates.url = body.url.trim();
    }
    if (
      typeof body.category === "string" &&
      (ASSET_CATEGORIES as readonly string[]).includes(body.category)
    ) {
      updates.category = body.category as AssetCategory;
    }
    if (body.visibility === "internal" || body.visibility === "client_visible") {
      updates.visibility = body.visibility as Visibility;
    }
    if ("folderId" in body) {
      updates.folder_id =
        typeof body.folderId === "string" && body.folderId.length > 0
          ? body.folderId
          : null;
    }
    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, "no_fields");
    }

    const supabase = await getSupabaseServer();
    const { error } = await supabase
      .from("asset_links")
      .update(updates as never)
      .eq("id", id)
      .eq("client_id", client.id);
    if (error) throw new HttpError(500, "db_write_failed");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    requireOrgRole(session, ["user", "editor", "director"]);
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();
    const { error } = await supabase
      .from("asset_links")
      .delete()
      .eq("id", id)
      .eq("client_id", client.id);
    if (error) throw new HttpError(500, "db_delete_failed");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
