/**
 * GET /api/clients/[id]/report/export-pdf?period=monthly|weekly
 *
 * Manager-only PDF version of the client recap. Same data shape as
 * /api/clients/[id]/report — duplicates the load (rather than calling it
 * over HTTP) so the cold start stays fast.
 *
 * Filename: CreatorHub_Recap_<client>_<YYYY-MM-DD>.pdf
 */

import { type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type RouteContext = { params: Promise<{ id: string }> };

type RelationshipRow = {
  id: string;
  manager_id: string;
  creator_id: string | null;
  status: string;
};

type CounterpartyRow = {
  id: string;
  email: string;
  display_name: string | null;
};

type ScriptCountRow = { status: string };
type SequenceCountRow = { status: string };
type TaskCountRow = { id: string };
type TopPostRow = {
  id: string;
  caption: string | null;
  platform: string;
  reach: number | null;
  likes: number | null;
  engagement_rate: number | null;
  published_at: string | null;
  thumbnail_url: string | null;
};

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return jsonError("unauthorized", 401);
  const editorId = userRes.user.id;

  const period = req.nextUrl.searchParams.get("period") === "weekly" ? "weekly" : "monthly";
  const windowStart = new Date();
  if (period === "weekly") windowStart.setUTCDate(windowStart.getUTCDate() - 7);
  else windowStart.setUTCMonth(windowStart.getUTCMonth() - 1);
  const windowStartIso = windowStart.toISOString();

  const { data: relRow } = await supabase
    .from("creator_relationships")
    .select("id, manager_id, creator_id, status")
    .eq("id", id)
    .maybeSingle();
  const rel = (relRow ?? null) as RelationshipRow | null;
  if (!rel) return jsonError("not_found", 404);
  if (rel.manager_id !== editorId) return jsonError("manager_only", 403);
  if (rel.status !== "active") return jsonError("relationship_not_active", 403);
  if (!rel.creator_id) return jsonError("client_not_active", 403);
  const clientUserId = rel.creator_id;

  const admin = getSupabaseServiceRole();

  const [
    counterpartyRes,
    scriptsRes,
    sequencesRes,
    publishedPostsRes,
    tasksRes,
    topPostsRes,
  ] = await Promise.all([
    admin
      .from("users")
      .select("id, email, display_name")
      .eq("id", clientUserId)
      .maybeSingle(),
    admin
      .from("generated_scripts")
      .select("status")
      .eq("user_id", clientUserId)
      .gte("created_at", windowStartIso)
      .returns<ScriptCountRow[]>(),
    admin
      .from("sequences")
      .select("status")
      .eq("user_id", clientUserId)
      .gte("created_at", windowStartIso)
      .returns<SequenceCountRow[]>(),
    admin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", clientUserId)
      .eq("lifecycle_state", "published")
      .gte("published_at", windowStartIso),
    admin
      .from("relationship_tasks")
      .select("id")
      .eq("relationship_id", id)
      .eq("status", "done")
      .gte("completed_at", windowStartIso)
      .returns<TaskCountRow[]>(),
    admin
      .from("posts")
      .select("id, caption, platform, reach, likes, engagement_rate, published_at, thumbnail_url")
      .eq("user_id", clientUserId)
      .eq("lifecycle_state", "published")
      .gte("published_at", windowStartIso)
      .order("engagement_rate", { ascending: false, nullsFirst: false })
      .limit(5)
      .returns<TopPostRow[]>(),
  ]);

  if (
    scriptsRes.error ||
    sequencesRes.error ||
    publishedPostsRes.error ||
    tasksRes.error ||
    topPostsRes.error
  ) {
    log.error("clients.report.export_pdf.load_failed", {
      scripts: scriptsRes.error,
      sequences: sequencesRes.error,
      posts: publishedPostsRes.error,
      tasks: tasksRes.error,
      top: topPostsRes.error,
    });
    return jsonError("load_failed", 500);
  }

  const counterparty = (counterpartyRes.data ?? null) as CounterpartyRow | null;
  const clientName =
    counterparty?.display_name ??
    counterparty?.email?.split("@")[0] ??
    "Client";

  const scriptsByStatus = countByStatus(scriptsRes.data);
  const sequencesByStatus = countByStatus(sequencesRes.data);

  const [{ renderToBuffer }, { ClientReportPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/client-report-pdf"),
  ]);

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      ClientReportPdf({
        report: {
          clientName,
          period,
          windowStart: windowStartIso,
          windowEnd: new Date().toISOString(),
          scripts: {
            total: scriptsRes.data?.length ?? 0,
            draft: scriptsByStatus.draft ?? 0,
            approved: scriptsByStatus.approved ?? 0,
            used: scriptsByStatus.used ?? 0,
          },
          sequences: {
            total: sequencesRes.data?.length ?? 0,
            draft: sequencesByStatus.draft ?? 0,
            scheduled: sequencesByStatus.scheduled ?? 0,
            published: sequencesByStatus.published ?? 0,
          },
          postsPublished: publishedPostsRes.count ?? 0,
          tasksCompleted: tasksRes.data?.length ?? 0,
          topPosts: (topPostsRes.data ?? []).map((p) => ({
            caption: p.caption,
            platform: p.platform,
            reach: p.reach,
            likes: p.likes,
            engagementRate: p.engagement_rate,
            publishedAt: p.published_at,
          })),
        },
      }),
    );
  } catch (err) {
    log.error("clients.report.export_pdf.render_failed", err);
    return jsonError("render_failed", 500);
  }

  const slug = clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "client";
  const date = new Date().toISOString().slice(0, 10);
  const filename = `CreatorHub_Recap_${slug}_${date}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(buffer.length),
      "cache-control": "private, max-age=0, no-store",
    },
  });
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function countByStatus<T extends { status: string }>(
  rows: T[] | null,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows ?? []) {
    out[r.status] = (out[r.status] ?? 0) + 1;
  }
  return out;
}
