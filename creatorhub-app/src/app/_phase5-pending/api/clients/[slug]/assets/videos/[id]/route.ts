/**
 * GET    /api/clients/[slug]/assets/videos/[id]   — status poller + playback urls
 * PATCH  /api/clients/[slug]/assets/videos/[id]   — title / folder / visibility / reviewStatus
 *                                                    (reviewStatus='approved' requires director)
 * DELETE /api/clients/[slug]/assets/videos/[id]   — DB delete + best-effort Bunny delete
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getAgencySession,
  requireClientAccess,
  requireOrgRole,
  HttpError,
  httpErrorResponse,
} from "@/lib/agency/phase5-deps";
import {
  type AssetVideo,
  type AssetVideoStatusResponse,
  type BunnyVideoStatus,
  type ReviewStatus,
  type Visibility,
} from "@/lib/agency/assets-types";
import {
  deleteVideo,
  getVideo,
  mapStatus,
  signedPlaybackUrl,
  thumbnailUrl,
} from "@/lib/bunny/client";
import { log } from "@/lib/log";

type Params = { params: Promise<{ slug: string; id: string }> };

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

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();
    const { data: row, error } = await supabase
      .from("asset_videos")
      .select("*")
      .eq("id", id)
      .eq("client_id", client.id)
      .single()
      .returns<DbRow>();
    if (error || !row) throw new HttpError(404, "not_found");

    let current = row;
    if (
      row.bunny_video_id &&
      row.bunny_video_status !== "ready" &&
      row.bunny_video_status !== "failed"
    ) {
      try {
        const live = await getVideo(row.bunny_video_id);
        if (live) {
          const mapped = mapStatus(live.status);
          if (
            mapped.status !== row.bunny_video_status ||
            (live.length > 0 && row.bunny_video_duration_seconds === null)
          ) {
            const updates: Record<string, unknown> = {
              bunny_video_status: mapped.status,
            };
            if (live.length > 0) {
              updates.bunny_video_duration_seconds = live.length;
            }
            const { data: synced } = await supabase
              .from("asset_videos")
              .update(updates as never)
              .eq("id", id)
              .eq("client_id", client.id)
              .select("*")
              .single()
              .returns<DbRow>();
            if (synced) current = synced;
          }
        }
      } catch (e) {
        log.warn("assets.videos.bunny_sync_failed", {
          id,
          err: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const response: AssetVideoStatusResponse = { video: toVideo(current) };
    if (current.bunny_video_status === "ready" && current.bunny_video_id) {
      response.playback = {
        hlsUrl: signedPlaybackUrl(current.bunny_video_id),
        posterUrl: thumbnailUrl(current.bunny_video_id),
      };
    }
    return NextResponse.json(response);
  } catch (err) {
    return httpErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    requireOrgRole(session, ["user", "editor", "director"]);
    const client = await requireClientAccess(slug);

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      throw new HttpError(400, "invalid_json");
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) {
      updates.title = body.title.trim().slice(0, 200);
    }
    if (body.visibility === "internal" || body.visibility === "client_visible") {
      updates.visibility = body.visibility as Visibility;
    }
    if ("folderId" in body) {
      updates.folder_id =
        typeof body.folderId === "string" && body.folderId.length > 0
          ? body.folderId
          : null;
    }
    if (
      typeof body.reviewStatus === "string" &&
      (["draft", "in_review", "changes_requested", "approved"] as const).includes(
        body.reviewStatus as ReviewStatus,
      )
    ) {
      if (body.reviewStatus === "approved") {
        requireOrgRole(session, ["director"]);
      }
      updates.review_status = body.reviewStatus as ReviewStatus;
    }

    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, "no_fields");
    }

    const supabase = await getSupabaseServer();
    const { error } = await supabase
      .from("asset_videos")
      .update(updates as never)
      .eq("id", id)
      .eq("client_id", client.id);
    if (error) throw new HttpError(500, "db_write_failed");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    requireOrgRole(session, ["user", "editor", "director"]);
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();

    const { data: row } = await supabase
      .from("asset_videos")
      .select("bunny_video_id")
      .eq("id", id)
      .eq("client_id", client.id)
      .maybeSingle()
      .returns<{ bunny_video_id: string | null } | null>();

    const { error } = await supabase
      .from("asset_videos")
      .delete()
      .eq("id", id)
      .eq("client_id", client.id);
    if (error) throw new HttpError(500, "db_delete_failed");

    if (row?.bunny_video_id) {
      try {
        await deleteVideo(row.bunny_video_id);
      } catch (e) {
        log.warn("assets.videos.bunny_delete_failed", {
          id,
          err: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return httpErrorResponse(err);
  }
}
