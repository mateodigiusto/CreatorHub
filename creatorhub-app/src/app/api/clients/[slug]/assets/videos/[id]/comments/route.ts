/**
 * GET   /api/clients/[slug]/assets/videos/[id]/comments
 * POST  /api/clients/[slug]/assets/videos/[id]/comments — threaded, timestamp-anchored
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getAgencySession,
  requireClientAccess,
  HttpError,
  httpErrorResponse,
} from "@/lib/agency/phase5-deps";
import {
  toComment,
  parseCommentInput,
  type CommentDbRow,
} from "@/lib/agency/comments-helpers";

type Params = { params: Promise<{ slug: string; id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("content_comments")
      .select("*")
      .eq("client_id", client.id)
      .eq("asset_video_id", id)
      .order("created_at", { ascending: true })
      .returns<CommentDbRow[]>();
    if (error) throw new HttpError(500, "db_read_failed");
    return NextResponse.json({ comments: (data ?? []).map(toComment) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    const client = await requireClientAccess(slug);

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      throw new HttpError(400, "invalid_json");
    }

    let parsed;
    try {
      parsed = parseCommentInput(body, {
        allowInternal: !client.isClientViewer,
      });
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : "invalid");
    }

    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("content_comments")
      .insert({
        organization_id: client.organizationId,
        client_id: client.id,
        content_item_id: null,
        asset_video_id: id,
        parent_id: parsed.parentId,
        author_id: session.userId,
        body: parsed.body,
        is_internal: parsed.isInternal,
        timestamp_seconds: parsed.timestampSeconds,
      } as never)
      .select("*")
      .single()
      .returns<CommentDbRow>();
    if (error || !data) throw new HttpError(500, "db_write_failed");
    return NextResponse.json({ comment: toComment(data) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
