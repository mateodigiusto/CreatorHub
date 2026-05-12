/**
 * Shared helpers for the content-comments routes.
 *
 * `content_comments` rows attach to EITHER a content_item OR an asset_video
 * (DB check constraint enforces exactly one). The two comment endpoints
 * share validation + shaping, so it lives here.
 */

import type { ContentComment } from "@/lib/agency/assets-types";

export type CommentDbRow = {
  id: string;
  organization_id: string;
  client_id: string;
  content_item_id: string | null;
  asset_video_id: string | null;
  parent_id: string | null;
  author_id: string | null;
  body: string;
  is_internal: boolean;
  timestamp_seconds: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export function toComment(row: CommentDbRow): ContentComment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    contentItemId: row.content_item_id,
    assetVideoId: row.asset_video_id,
    parentId: row.parent_id,
    authorId: row.author_id,
    body: row.body,
    isInternal: row.is_internal,
    timestampSeconds:
      row.timestamp_seconds === null ? null : Number(row.timestamp_seconds),
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ParsedCommentBody = {
  body: string;
  parentId: string | null;
  isInternal: boolean;
  timestampSeconds: number | null;
};

export function parseCommentInput(
  body: Record<string, unknown>,
  opts: { allowInternal: boolean },
): ParsedCommentBody {
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) throw new Error("body_required");
  if (text.length > 4000) throw new Error("body_too_long");

  const parentId =
    typeof body.parentId === "string" && body.parentId.length > 0
      ? body.parentId
      : null;

  const isInternal = opts.allowInternal && body.isInternal === true;

  let timestampSeconds: number | null = null;
  if (typeof body.timestampSeconds === "number") {
    if (
      !Number.isFinite(body.timestampSeconds) ||
      body.timestampSeconds < 0 ||
      body.timestampSeconds > 24 * 60 * 60
    ) {
      throw new Error("timestamp_invalid");
    }
    timestampSeconds = Math.round(body.timestampSeconds * 100) / 100;
  }

  return { body: text, parentId, isInternal, timestampSeconds };
}
