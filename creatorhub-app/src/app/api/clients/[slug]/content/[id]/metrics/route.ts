/**
 * Manual metrics PATCH — upserts the 1:1 content_metrics row.
 *
 * `content_metrics` is keyed by `content_item_id` (no separate PK). All five
 * count columns default to 0, so an upsert with a partial body fills in
 * the row safely.
 *
 * Body: { views?, likes?, comments_count?, shares?, saves? } — non-negative ints.
 * Always writes `source = 'manual'`. Instagram-API sync is a future code path.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  HttpError,
  httpErrorResponse,
  requireClientAccess,
} from "@/lib/agency/phase3-stubs";
import { METRIC_FIELDS } from "@/lib/agency/content";

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { slug, id } = await ctx.params;
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();

    const { data: item } = await supabase
      .from("content_items")
      .select("id")
      .eq("id", id)
      .eq("client_id", client.id)
      .maybeSingle();
    if (!item) throw new HttpError(404, "not_found");

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Record<string, number> = {};
    for (const k of METRIC_FIELDS) {
      const v = body[k];
      if (v === undefined || v === null) continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) {
        throw new HttpError(400, `bad_${k}`);
      }
      patch[k] = Math.trunc(n);
    }

    if (Object.keys(patch).length === 0) {
      throw new HttpError(400, "no_op");
    }

    const res = await supabase
      .from("content_metrics")
      .upsert(
        {
          organization_id: client.organizationId,
          client_id: client.id,
          content_item_id: id,
          source: "manual",
          ...patch,
        } as never,
        { onConflict: "content_item_id" },
      )
      .select(
        "content_item_id, organization_id, client_id, views, likes, comments_count, shares, saves, reach, impressions, source, captured_at, updated_at",
      )
      .maybeSingle();

    if (res.error) throw new HttpError(500, res.error.message);
    return NextResponse.json({ metrics: res.data });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
