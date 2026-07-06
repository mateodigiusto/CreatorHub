/**
 * GET   /api/clients/[slug]/folders  — list every folder for a client
 * POST  /api/clients/[slug]/folders  — create one
 *
 * STAGED — see docs/plans/agency-clients-phase5-NOTES.md.
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
import type { Folder, FolderScope, Visibility } from "@/lib/agency/assets-types";

type Params = { params: Promise<{ slug: string }> };

type DbRow = {
  id: string;
  organization_id: string;
  client_id: string;
  parent_id: string | null;
  name: string;
  scope: FolderScope;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
};

function toFolder(row: DbRow): Folder {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    parentId: row.parent_id,
    name: row.name,
    scope: row.scope,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("client_id", client.id)
      .order("name", { ascending: true })
      .returns<DbRow[]>();
    if (error) throw new HttpError(500, "db_read_failed");
    return NextResponse.json({ folders: (data ?? []).map(toFolder) });
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

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) throw new HttpError(400, "name_required");
    const scope: FolderScope = body.scope === "sop" ? "sop" : "asset";
    const visibility: Visibility =
      body.visibility === "client_visible" ? "client_visible" : "internal";
    const parentId =
      typeof body.parentId === "string" && body.parentId.length > 0
        ? body.parentId
        : null;

    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("folders")
      .insert({
        client_id: client.id,
        organization_id: client.organizationId,
        parent_id: parentId,
        name: name.slice(0, 120),
        scope,
        visibility,
        created_by: session.userId,
      } as never)
      .select("*")
      .single()
      .returns<DbRow>();
    if (error || !data) throw new HttpError(500, "db_write_failed");
    return NextResponse.json({ folder: toFolder(data) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
