/**
 * GET   /api/clients/[slug]/assets/videos — list (?folderId, ?reviewStatus)
 * POST  /api/clients/[slug]/assets/videos — create Bunny shell + DB row;
 *                                            returns TUS upload params.
 *
 * Plan-gated: `videoUpload` (Phase 6 wires real enforcement).
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getAgencySession,
  requireClientAccess,
  requireOrgRole,
  assertPlanAllows,
  HttpError,
  httpErrorResponse,
} from "@/lib/agency/phase5-deps";
import {
  type AssetVideo,
  type AssetVideoCreateResponse,
  type BunnyVideoStatus,
  type ReviewStatus,
  type Visibility,
} from "@/lib/agency/assets-types";
import { createVideo, tusUploadParams } from "@/lib/bunny/client";
import { log } from "@/lib/log";

type Params = { params: Promise<{ slug: string }> };

type DbRow = {
  id: string;
  organization_id: string;
  client_id: string;
  folder_id: string | null;
  title: string;
  bunny_video_id: string | null;
  bunny_video_status: BunnyVideoStatus;
  bunny_video_duration_seconds: string | null;
  review_status: ReviewStatus;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
};

function toVideo(row: DbRow): AssetVideo {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    folderId: row.folder_id,
    title: row.title,
    bunnyVideoId: row.bunny_video_id,
    bunnyVideoStatus: row.bunny_video_status,
    bunnyVideoDurationSeconds:
      row.bunny_video_duration_seconds === null
        ? null
        : Number(row.bunny_video_duration_seconds),
    reviewStatus: row.review_status,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    const client = await requireClientAccess(slug);
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const reviewStatus = searchParams.get("reviewStatus");
    const supabase = await getSupabaseServer();
    let q = supabase
      .from("asset_videos")
      .select("*")
      .eq("client_id", client.id);
    if (folderId) q = q.eq("folder_id", folderId);
    if (reviewStatus) q = q.eq("review_status", reviewStatus);
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .returns<DbRow[]>();
    if (error) throw new HttpError(500, "db_read_failed");
    return NextResponse.json({ videos: (data ?? []).map(toVideo) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    requireOrgRole(session, ["user", "editor", "director"]);
    assertPlanAllows(session, "videoUpload");
    const client = await requireClientAccess(slug);

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      throw new HttpError(400, "invalid_json");
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) throw new HttpError(400, "title_required");
    const folderId =
      typeof body.folderId === "string" && body.folderId.length > 0
        ? body.folderId
        : null;
    const visibility: Visibility =
      body.visibility === "client_visible" ? "client_visible" : "internal";

    let bunnyGuid: string;
    try {
      const created = await createVideo({ title: title.slice(0, 200) });
      bunnyGuid = created.guid;
    } catch (e) {
      log.error("assets.videos.bunny_create_failed", {
        slug,
        err: e instanceof Error ? e.message : String(e),
      });
      throw new HttpError(502, "bunny_create_failed");
    }

    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("asset_videos")
      .insert({
        client_id: client.id,
        organization_id: client.organizationId,
        folder_id: folderId,
        title: title.slice(0, 200),
        bunny_video_id: bunnyGuid,
        bunny_video_status: "uploading",
        visibility,
        created_by: session.userId,
      } as never)
      .select("*")
      .single()
      .returns<DbRow>();
    if (error || !data) {
      log.error("assets.videos.db_insert_failed", {
        slug,
        bunnyGuid,
        err: error?.message,
      });
      throw new HttpError(500, "db_write_failed");
    }

    const upload = tusUploadParams(bunnyGuid);
    const response: AssetVideoCreateResponse = {
      video: toVideo(data),
      upload,
    };
    return NextResponse.json(response);
  } catch (err) {
    return httpErrorResponse(err);
  }
}
