/**
 * GET   /api/clients/[slug]/internal-notes  — staff-only read
 * PATCH /api/clients/[slug]/internal-notes  — staff-only write (body string)
 *
 * RLS already strips this table from client-side users (no
 * has_client_access clause), so a misrouted client request returns 0 rows
 * on GET and a row-not-found 404 on PATCH. The route handler still gates
 * on `requireOrgRole` for a clearer error code.
 *
 * STAGED. Move to src/app/api/clients/[slug]/internal-notes/ at cutover.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getAgencySession,
  requireClientAccess,
  requireOrgRole,
  HttpError,
  httpErrorResponse,
} from "@/lib/agency/phase3-stubs";
import type { ClientInternalNotes } from "@/lib/agency/workspace-types";

type Params = { params: Promise<{ slug: string }> };

type DbRow = {
  client_id: string;
  organization_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

function rowToNotes(row: DbRow): ClientInternalNotes {
  return {
    clientId: row.client_id,
    organizationId: row.organization_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    requireOrgRole(session, ["user", "editor", "director"]);
    const client = await requireClientAccess(slug);

    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("client_internal_notes")
      .select("*")
      .eq("client_id", client.id)
      .maybeSingle()
      .returns<DbRow | null>();
    if (error) throw new HttpError(500, "db_read_failed");

    if (!data) {
      return NextResponse.json({
        notes: {
          clientId: client.id,
          organizationId: client.organizationId,
          body: "",
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        } satisfies ClientInternalNotes,
      });
    }

    return NextResponse.json({ notes: rowToNotes(data) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    // The plan only lets `director` edit internal notes — gate explicitly.
    requireOrgRole(session, ["director"]);
    const client = await requireClientAccess(slug);

    let body: { body?: unknown };
    try {
      body = (await req.json()) as { body?: unknown };
    } catch {
      throw new HttpError(400, "invalid_json");
    }
    if (typeof body.body !== "string") {
      throw new HttpError(400, "body_required");
    }
    const trimmed =
      body.body.length > 16000 ? body.body.slice(0, 16000) : body.body;

    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("client_internal_notes")
      .upsert(
        {
          client_id: client.id,
          organization_id: client.organizationId,
          body: trimmed,
        } as never,
        { onConflict: "client_id" }
      )
      .select("*")
      .single()
      .returns<DbRow>();
    if (error) throw new HttpError(500, "db_write_failed");

    return NextResponse.json({ notes: rowToNotes(data) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
