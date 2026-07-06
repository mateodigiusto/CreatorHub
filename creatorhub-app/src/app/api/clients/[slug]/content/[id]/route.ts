/**
 * Single content_item — PATCH (auto-save on blur) + DELETE.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  HttpError,
  httpErrorResponse,
  requireClientAccess,
} from "@/lib/agency/phase3-stubs";
import {
  CONTENT_TYPES,
  type ContentType,
} from "@/lib/agency/content";

type Ctx = { params: Promise<{ slug: string; id: string }> };

const EDITABLE_FIELDS = new Set([
  "title",
  "content_type",
  "hook_a",
  "hook_b",
  "hook_c",
  "script",
  "caption",
  "visual_notes",
  "planned_post_date",
  "published_at",
]);

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { slug, id } = await ctx.params;
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (!EDITABLE_FIELDS.has(k)) continue;
      if (k === "content_type") {
        // content_type is NOT NULL in schema; ignore null patches.
        if (v === null) continue;
        if (!CONTENT_TYPES.includes(v as ContentType)) continue;
      }
      if (k === "title") {
        const t = (v as string | null) ?? "";
        patch[k] = t.trim() || "Untitled";
        continue;
      }
      patch[k] = v;
    }

    if (Object.keys(patch).length === 0) {
      throw new HttpError(400, "no_op");
    }

    const res = await supabase
      .from("content_items")
      .update(patch as never)
      .eq("id", id)
      .eq("client_id", client.id)
      .select(
        "id, organization_id, client_id, status, content_type, title, hook_a, hook_b, hook_c, script, caption, visual_notes, bunny_video_id, bunny_video_status, bunny_video_duration_seconds, planned_post_date, published_at, position, visibility, created_by, created_at, updated_at",
      )
      .maybeSingle();

    if (res.error) throw new HttpError(500, res.error.message);
    if (!res.data) throw new HttpError(404, "not_found");
    return NextResponse.json({ item: res.data });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { slug, id } = await ctx.params;
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();

    const { error } = await supabase
      .from("content_items")
      .delete()
      .eq("id", id)
      .eq("client_id", client.id);
    if (error) throw new HttpError(500, error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
