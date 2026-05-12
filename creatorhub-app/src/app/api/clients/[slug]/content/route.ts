/**
 * Agency client content pipeline — list + create.
 *
 * GET  /api/clients/[slug]/content   → list all content_items for the client,
 *                                       joined with their content_metrics row,
 *                                       ordered by (status, position).
 * POST /api/clients/[slug]/content   → create a new content_item appended to a
 *                                       given column.
 *
 * Session + access resolved via the cross-phase shim
 * `@/lib/agency/phase3-stubs`. When Phase 1 + Phase 2 land, swap imports to
 * the real `@/lib/auth/*` modules per that file's cutover comment.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  HttpError,
  httpErrorResponse,
  requireClientAccess,
} from "@/lib/agency/phase3-stubs";
import {
  CONTENT_STATUSES,
  CONTENT_TYPES,
  type ContentStatus,
  type ContentType,
  type ContentItemRow,
  type ContentMetricsRow,
} from "@/lib/agency/content";

type ContentItemRowWithMetrics = ContentItemRow & {
  metrics: ContentMetricsRow | ContentMetricsRow[] | null;
};

type SlugCtx = { params: Promise<{ slug: string }> };

const CONTENT_SELECT = `
  id, organization_id, client_id, status, content_type, title,
  hook_a, hook_b, hook_c, script, caption, visual_notes,
  bunny_video_id, bunny_video_status, bunny_video_duration_seconds,
  planned_post_date, published_at, position, visibility,
  created_by, created_at, updated_at,
  metrics:content_metrics (
    content_item_id, organization_id, client_id,
    views, likes, comments_count, shares, saves,
    reach, impressions, source, captured_at, updated_at
  )
`;

export async function GET(_req: NextRequest, ctx: SlugCtx) {
  try {
    const { slug } = await ctx.params;
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();

    const res = await supabase
      .from("content_items")
      .select(CONTENT_SELECT)
      .eq("client_id", client.id)
      .order("status", { ascending: true })
      .order("position", { ascending: true });

    if (res.error) throw new HttpError(500, res.error.message);

    const rows = (res.data ?? []) as unknown as ContentItemRowWithMetrics[];
    const items = rows.map((row) => {
      const m = Array.isArray(row.metrics)
        ? row.metrics[0] ?? null
        : row.metrics;
      return { ...row, metrics: m };
    });

    return NextResponse.json({ items });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

export async function POST(req: NextRequest, ctx: SlugCtx) {
  try {
    const { slug } = await ctx.params;
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();

    const body = (await req.json().catch(() => ({}))) as {
      status?: string;
      content_type?: string;
      title?: string;
    };

    const status = (body.status ?? "idea") as ContentStatus;
    if (!CONTENT_STATUSES.includes(status)) {
      throw new HttpError(400, "bad_status");
    }
    const contentType =
      body.content_type && CONTENT_TYPES.includes(body.content_type as ContentType)
        ? (body.content_type as ContentType)
        : "reel"; // 0035 default

    const tailRes = await supabase
      .from("content_items")
      .select("position")
      .eq("client_id", client.id)
      .eq("status", status)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const tail = tailRes.data as unknown as { position: number } | null;
    const nextPosition = (tail?.position ?? 0) + 1024;

    const insertRes = await supabase
      .from("content_items")
      .insert({
        organization_id: client.organizationId,
        client_id: client.id,
        status,
        content_type: contentType,
        title: (body.title ?? "").trim() || "Untitled",
        position: nextPosition,
      } as never)
      .select(CONTENT_SELECT)
      .single();

    if (insertRes.error) {
      throw new HttpError(500, insertRes.error.message);
    }
    const data = insertRes.data as unknown as ContentItemRowWithMetrics | null;
    if (!data) throw new HttpError(500, "insert_failed");

    return NextResponse.json(
      { item: { ...data, metrics: null } },
      { status: 201 },
    );
  } catch (err) {
    return httpErrorResponse(err);
  }
}
