/**
 * GET   /api/clients/[slug]/meetings — list (desc by meeting_date)
 * POST  /api/clients/[slug]/meetings — create
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
import type { MeetingNote, Visibility } from "@/lib/agency/assets-types";

type Params = { params: Promise<{ slug: string }> };

type DbRow = {
  id: string;
  organization_id: string;
  client_id: string;
  meeting_date: string;
  title: string;
  body: string | null;
  attendees: string | null;
  action_items: string | null;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
};

function toMeeting(row: DbRow): MeetingNote {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    meetingDate: row.meeting_date,
    title: row.title,
    body: row.body,
    attendees: row.attendees,
    actionItems: row.action_items,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("meeting_notes")
      .select("*")
      .eq("client_id", client.id)
      .order("meeting_date", { ascending: false })
      .returns<DbRow[]>();
    if (error) throw new HttpError(500, "db_read_failed");
    return NextResponse.json({ meetings: (data ?? []).map(toMeeting) });
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
    const meetingDate =
      typeof body.meetingDate === "string" ? body.meetingDate.trim() : "";
    if (!title) throw new HttpError(400, "title_required");
    if (!ISO_DATE.test(meetingDate)) throw new HttpError(400, "date_invalid");

    const visibility: Visibility =
      body.visibility === "client_visible" ? "client_visible" : "internal";

    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("meeting_notes")
      .insert({
        organization_id: client.organizationId,
        client_id: client.id,
        meeting_date: meetingDate,
        title: title.slice(0, 200),
        body: typeof body.body === "string" ? body.body.slice(0, 16000) : null,
        attendees:
          typeof body.attendees === "string" ? body.attendees.slice(0, 500) : null,
        action_items:
          typeof body.actionItems === "string"
            ? body.actionItems.slice(0, 8000)
            : null,
        visibility,
        created_by: session.userId,
      } as never)
      .select("*")
      .single()
      .returns<DbRow>();
    if (error || !data) throw new HttpError(500, "db_write_failed");
    return NextResponse.json({ meeting: toMeeting(data) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
