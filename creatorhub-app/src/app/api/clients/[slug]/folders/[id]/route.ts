/**
 * PATCH  /api/clients/[slug]/folders/[id]
 * DELETE /api/clients/[slug]/folders/[id]
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
import type { Visibility } from "@/lib/agency/assets-types";

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
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim().slice(0, 120);
    }
    if ("parentId" in body) {
      updates.parent_id =
        typeof body.parentId === "string" && body.parentId.length > 0
          ? body.parentId
          : null;
    }
    if (body.visibility === "internal" || body.visibility === "client_visible") {
      updates.visibility = body.visibility as Visibility;
    }
    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, "no_fields");
    }

    const supabase = await getSupabaseServer();
    const { error } = await supabase
      .from("folders")
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
      .from("folders")
      .delete()
      .eq("id", id)
      .eq("client_id", client.id);
    if (error) throw new HttpError(500, "db_delete_failed");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
