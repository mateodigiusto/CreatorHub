/**
 * Move a content_item across the kanban — single PATCH for status + position.
 *
 * Body: { status: ContentStatus, position: number }
 *
 * Position is a double precision float; the client computes the midpoint
 * between neighbours so the move is a single UPDATE with no whole-column
 * rewrite. If float space gets too tight (>1e12 collisions), a future
 * normalize-job can sweep a column and rewrite positions. Out of scope for
 * Phase 4.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  HttpError,
  httpErrorResponse,
  requireClientAccess,
} from "@/lib/agency/phase3-stubs";
import { CONTENT_STATUSES, type ContentStatus } from "@/lib/agency/content";

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { slug, id } = await ctx.params;
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();

    const body = (await req.json().catch(() => ({}))) as {
      status?: string;
      position?: number;
    };

    const status = body.status as ContentStatus | undefined;
    if (!status || !CONTENT_STATUSES.includes(status)) {
      throw new HttpError(400, "bad_status");
    }
    if (typeof body.position !== "number" || !Number.isFinite(body.position)) {
      throw new HttpError(400, "bad_position");
    }

    const patch: Record<string, unknown> = {
      status,
      position: body.position,
    };
    // Auto-mark published_at when entering `post` for the first time.
    if (status === "post") {
      const existingRes = await supabase
        .from("content_items")
        .select("published_at")
        .eq("id", id)
        .eq("client_id", client.id)
        .maybeSingle();
      const existing = existingRes.data as unknown as { published_at: string | null } | null;
      if (existing && !existing.published_at) {
        patch.published_at = new Date().toISOString();
      }
    }

    const res = await supabase
      .from("content_items")
      .update(patch as never)
      .eq("id", id)
      .eq("client_id", client.id)
      .select("id, status, position, published_at, updated_at")
      .maybeSingle();

    if (res.error) throw new HttpError(500, res.error.message);
    if (!res.data) throw new HttpError(404, "not_found");
    return NextResponse.json({ item: res.data });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
