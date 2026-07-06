/**
 * GET /api/creators
 *
 * Paginated, filterable read of the global creator_directory. Read RLS
 * is open to any authenticated user (the directory is a subscription
 * perk for editors but the policy is the simpler "any signed-in user").
 *
 * Filters (all optional):
 *   ?niche=...
 *   ?platform=instagram|tiktok|youtube|linkedin|x|facebook
 *   ?follower_range=under_10k|10k_50k|50k_250k|250k_1m|over_1m
 *   ?q=...   (substring match against handle, display_name, niche)
 *   ?limit=50  (max 100)
 *   ?offset=0
 *
 * Response also includes the user's existing target rows so the UI can
 * show "Saved" / "Pitched" pills inline without a second fetch.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

const VALID_PLATFORM = new Set([
  "instagram", "tiktok", "youtube", "linkedin", "x", "facebook",
]);
const VALID_FOLLOWER_RANGE = new Set([
  "under_10k", "10k_50k", "50k_250k", "250k_1m", "over_1m",
]);

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const niche = searchParams.get("niche");
  const platform = searchParams.get("platform");
  const followerRange = searchParams.get("follower_range");
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50),
  );
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

  let query = supabase
    .from("creator_directory")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (niche) query = query.eq("niche", niche);
  if (platform && VALID_PLATFORM.has(platform)) {
    /* primary_platform is the canonical anchor; we filter on that even
       though the array `platforms` column overlaps. Keeps the query a
       simple equality on an indexed column. */
    query = query.eq("primary_platform", platform);
  }
  if (followerRange && VALID_FOLLOWER_RANGE.has(followerRange)) {
    query = query.eq("follower_range", followerRange);
  }
  if (q.length > 0) {
    /* ilike search across the three most useful text fields. The
       directory is small (200-500 rows) so a sequential scan is fine. */
    const escaped = q.replace(/[%_]/g, (c) => `\\${c}`);
    query = query.or(
      `handle.ilike.%${escaped}%,display_name.ilike.%${escaped}%,niche.ilike.%${escaped}%`,
    );
  }

  const [creatorsRes, targetsRes] = await Promise.all([
    query,
    supabase
      .from("editor_creator_targets")
      .select("creator_id, status")
      .eq("user_id", userRes.user.id),
  ]);

  if (creatorsRes.error) {
    log.error("creators.list.failed", creatorsRes.error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  type TargetLite = { creator_id: string; status: string };
  const targetByCreator = new Map<string, string>();
  for (const t of (targetsRes.data ?? []) as TargetLite[]) {
    targetByCreator.set(t.creator_id, t.status);
  }

  return NextResponse.json({
    creators: creatorsRes.data ?? [],
    total: creatorsRes.count ?? null,
    targetStatusByCreator: Object.fromEntries(targetByCreator),
  });
}
