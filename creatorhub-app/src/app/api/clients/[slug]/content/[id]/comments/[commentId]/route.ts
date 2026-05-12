/**
 * PATCH  /api/clients/[slug]/content/[id]/comments/[commentId]
 * DELETE /api/clients/[slug]/content/[id]/comments/[commentId]
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getAgencySession,
  requireClientAccess,
  HttpError,
  httpErrorResponse,
} from "@/lib/agency/phase5-deps";

type Params = {
  params: Promise<{ slug: string; id: string; commentId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug, id, commentId } = await params;
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

    const updates: Record<string, unknown> = {};
    if (typeof body.body === "string" && body.body.trim()) {
      const text = body.body.trim();
      if (text.length > 4000) throw new HttpError(400, "body_too_long");
      updates.body = text;
    }
    if (typeof body.resolved === "boolean") {
      updates.resolved_at = body.resolved ? new Date().toISOString() : null;
    }
    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, "no_fields");
    }

    const supabase = await getSupabaseServer();
    const { error } = await supabase
      .from("content_comments")
      .update(updates as never)
      .eq("id", commentId)
      .eq("client_id", client.id)
      .eq("content_item_id", id);
    if (error) throw new HttpError(500, "db_write_failed");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug, id, commentId } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();
    const { error } = await supabase
      .from("content_comments")
      .delete()
      .eq("id", commentId)
      .eq("client_id", client.id)
      .eq("content_item_id", id);
    if (error) throw new HttpError(500, "db_delete_failed");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
