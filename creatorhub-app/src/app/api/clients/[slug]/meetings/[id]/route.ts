/**
 * PATCH  /api/clients/[slug]/meetings/[id]
 * DELETE /api/clients/[slug]/meetings/[id]
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
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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
    if (typeof body.meetingDate === "string") {
      if (!ISO_DATE.test(body.meetingDate)) {
        throw new HttpError(400, "date_invalid");
      }
      updates.meeting_date = body.meetingDate;
    }
    if (typeof body.body === "string") {
      updates.body = body.body.slice(0, 16000);
    }
    if (typeof body.attendees === "string") {
      updates.attendees = body.attendees.slice(0, 500);
    }
    if (typeof body.actionItems === "string") {
      updates.action_items = body.actionItems.slice(0, 8000);
    }
    if (body.visibility === "internal" || body.visibility === "client_visible") {
      updates.visibility = body.visibility as Visibility;
    }
    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, "no_fields");
    }

    const supabase = await getSupabaseServer();
    const { error } = await supabase
      .from("meeting_notes")
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
      .from("meeting_notes")
      .delete()
      .eq("id", id)
      .eq("client_id", client.id);
    if (error) throw new HttpError(500, "db_delete_failed");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
