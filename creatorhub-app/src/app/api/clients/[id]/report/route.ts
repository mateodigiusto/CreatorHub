/**
 * GET /api/clients/[id]/report?period=monthly|weekly
 *
 * Returns an editor-facing summary of a client's activity inside the given
 * window. Manager-only — verified via `creator_relationships`.
 *
 * Counts:
 *   - generated_scripts (by status: draft, approved, used)
 *   - sequences (by status: draft, scheduled)
 *   - posts published in window
 *   - relationship_tasks completed in window
 *   - top published posts by engagement_rate (limit 5)
 *
 * In-app summary first per the v1 cut-line; PDF export comes next.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type RouteContext = { params: Promise<{ id: string }> };

type RelationshipRow = {
  id: string;
  manager_id: string;
  creator_id: string | null;
  status: string;
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
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const editorId = userRes.user.id;

  const period = req.nextUrl.searchParams.get("period") === "weekly" ? "weekly" : "monthly";
  const windowStart = new Date();
  if (period === "weekly") {
    windowStart.setUTCDate(windowStart.getUTCDate() - 7);
  } else {
    windowStart.setUTCMonth(windowStart.getUTCMonth() - 1);
  }
  const windowStartIso = windowStart.toISOString();

  /* Membership check via the editor's RLS-scoped session. */
  const { data: relRow } = await supabase
    .from("creator_relationships")
    .select("id, manager_id, creator_id, status")
    .eq("id", id)
    .maybeSingle();
  const rel = (relRow ?? null) as RelationshipRow | null;
  if (!rel) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (rel.manager_id !== editorId) {
    return NextResponse.json({ error: "manager_only" }, { status: 403 });
  }
  if (rel.status !== "active") {
    return NextResponse.json({ error: "relationship_not_active" }, { status: 403 });
  }
  if (!rel.creator_id) {
    return NextResponse.json({ error: "client_not_active" }, { status: 403 });
  }
  const clientUserId = rel.creator_id;

  /* Service-role reads of the client's data — membership above is the
     security boundary. We always filter `user_id = clientUserId`. */
  const admin = getSupabaseServiceRole();

  const [
    scriptsRes,
    sequencesRes,
    publishedPostsRes,
    tasksRes,
    topPostsRes,
  ] = await Promise.all([
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
      .select(
        "id, caption, platform, reach, likes, engagement_rate, published_at, thumbnail_url",
      )
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
    log.error("clients.report.load_failed", {
      scripts: scriptsRes.error,
      sequences: sequencesRes.error,
      posts: publishedPostsRes.error,
      tasks: tasksRes.error,
      top: topPostsRes.error,
    });
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  const scriptsByStatus = countByStatus(scriptsRes.data);
  const sequencesByStatus = countByStatus(sequencesRes.data);

  return NextResponse.json({
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
      id: p.id,
      caption: p.caption,
      platform: p.platform,
      reach: p.reach,
      likes: p.likes,
      engagementRate: p.engagement_rate,
      publishedAt: p.published_at,
      thumbnailUrl: p.thumbnail_url,
    })),
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
