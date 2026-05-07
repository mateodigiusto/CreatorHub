/**
 * Admin-only directory CRUD.
 *
 * GET   /api/admin/creators           — list (newest first, limit 200)
 * POST  /api/admin/creators           — bulk insert (CSV-parsed on the client)
 *
 * Schema for a single row:
 *   {
 *     handle: string                   (required, unique per primary_platform)
 *     primary_platform: platform_t     (required: instagram|tiktok|youtube|linkedin|x|facebook)
 *     niche: string                    (required)
 *     display_name?: string
 *     follower_range?: follower_range_t
 *     platforms?: platform_t[]
 *     posting_frequency?: posting_frequency_t
 *     bio?: string
 *     avatar_url?: string
 *     metadata?: object
 *   }
 *
 * Bulk POST body: { rows: NewRow[] }
 *   Returns { inserted: number, skipped: Array<{handle, reason}> }
 *
 * Inserts skip-on-conflict (handle, primary_platform) so re-running the
 * import is safe.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { requireAdmin } from "@/lib/admin/auth";

const VALID_PLATFORMS = new Set([
  "instagram", "tiktok", "youtube", "linkedin", "x", "facebook",
]);
const VALID_FOLLOWER_RANGES = new Set([
  "under_10k", "10k_50k", "50k_250k", "250k_1m", "over_1m",
]);
const VALID_POSTING_FREQ = new Set([
  "rarely", "weekly", "few_per_week", "daily", "multi_daily",
]);

type DirectoryRow = {
  id: string;
  handle: string;
  display_name: string | null;
  primary_platform: string;
  niche: string;
  follower_range: string | null;
  platforms: string[];
  posting_frequency: string | null;
  bio: string | null;
  avatar_url: string | null;
  metadata: Record<string, unknown>;
  curated_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }

  const admin = getSupabaseServiceRole();
  const { data, error } = await admin
    .from("creator_directory")
    .select(
      "id, handle, display_name, primary_platform, niche, follower_range, " +
        "platforms, posting_frequency, bio, avatar_url, metadata, curated_by, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<DirectoryRow[]>();

  if (error) {
    log.error("admin.creators.list_failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  return NextResponse.json({ creators: data ?? [], adminEmail: gate.email });
}

type NewRow = {
  handle?: string;
  display_name?: string;
  primary_platform?: string;
  niche?: string;
  follower_range?: string;
  platforms?: string[];
  posting_frequency?: string;
  bio?: string;
  avatar_url?: string;
  metadata?: Record<string, unknown>;
};

type PostBody = { rows?: NewRow[] };

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "no_rows" }, { status: 400 });
  }
  if (rows.length > 1000) {
    return NextResponse.json({ error: "too_many_rows" }, { status: 400 });
  }

  type Validated = {
    handle: string;
    display_name: string | null;
    primary_platform: string;
    niche: string;
    follower_range: string | null;
    platforms: string[];
    posting_frequency: string | null;
    bio: string | null;
    avatar_url: string | null;
    metadata: Record<string, unknown>;
    curated_by: string;
  };
  const valid: Validated[] = [];
  const skipped: Array<{ handle: string; reason: string }> = [];

  for (const r of rows) {
    const handle = (r.handle ?? "").trim().replace(/^@/, "");
    const platform = (r.primary_platform ?? "").trim().toLowerCase();
    const niche = (r.niche ?? "").trim();
    if (!handle) {
      skipped.push({ handle: handle || "(empty)", reason: "missing_handle" });
      continue;
    }
    if (!VALID_PLATFORMS.has(platform)) {
      skipped.push({ handle, reason: "invalid_primary_platform" });
      continue;
    }
    if (!niche) {
      skipped.push({ handle, reason: "missing_niche" });
      continue;
    }
    const followerRange = r.follower_range
      ? r.follower_range.trim().toLowerCase()
      : null;
    if (followerRange && !VALID_FOLLOWER_RANGES.has(followerRange)) {
      skipped.push({ handle, reason: "invalid_follower_range" });
      continue;
    }
    const postingFreq = r.posting_frequency
      ? r.posting_frequency.trim().toLowerCase()
      : null;
    if (postingFreq && !VALID_POSTING_FREQ.has(postingFreq)) {
      skipped.push({ handle, reason: "invalid_posting_frequency" });
      continue;
    }
    const platforms = Array.isArray(r.platforms)
      ? r.platforms
          .map((p) => p.trim().toLowerCase())
          .filter((p) => VALID_PLATFORMS.has(p))
      : [];

    valid.push({
      handle,
      display_name: r.display_name?.trim() || null,
      primary_platform: platform,
      niche,
      follower_range: followerRange,
      platforms: platforms.length > 0 ? platforms : [platform],
      posting_frequency: postingFreq,
      bio: r.bio?.trim() || null,
      avatar_url: r.avatar_url?.trim() || null,
      metadata: r.metadata ?? {},
      curated_by: gate.email,
    });
  }

  if (valid.length === 0) {
    return NextResponse.json(
      { inserted: 0, skipped, error: "all_rows_invalid" },
      { status: 400 },
    );
  }

  const admin = getSupabaseServiceRole();
  /* upsert with ignoreDuplicates so re-running the import is safe — the
     unique index on (lower(handle), primary_platform) handles dedupe. */
  const { error, count } = await admin
    .from("creator_directory")
    .upsert(valid as never[], {
      onConflict: "handle,primary_platform",
      ignoreDuplicates: true,
      count: "exact",
    });

  if (error) {
    log.error("admin.creators.insert_failed", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({
    inserted: count ?? valid.length,
    attempted: valid.length,
    skipped,
  });
}
