/**
 * Agency content-pipeline domain types + constants.
 *
 * Mirrors the real columns in `supabase/migrations/0035_client_workspace.sql`.
 * Two gotchas vs. the original §3.4 spec:
 *   - `content_type` is NOT NULL with default 'reel' (no nullable variant).
 *   - `planned_post_date` is a `date`, not a timestamptz — stored as
 *     `YYYY-MM-DD` strings on the wire.
 *   - The likes/comments column is named `comments_count` (Postgres-reserved
 *     word avoidance), not `comments`.
 */

export const CONTENT_STATUSES = [
  "idea",
  "script",
  "film",
  "edit",
  "post",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  idea: "Idea",
  script: "Script",
  film: "Film",
  edit: "Edit",
  post: "Post",
};

export const CONTENT_TYPES = [
  "reel",
  "story",
  "carousel",
  "short",
  "long_form",
  "image",
  "other",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  reel: "Reel",
  story: "Story",
  carousel: "Carousel",
  short: "Short",
  long_form: "Long-form",
  image: "Image",
  other: "Other",
};

export type BunnyVideoStatus =
  | "uploading"
  | "processing"
  | "ready"
  | "failed";

export type Visibility = "internal" | "client_visible";

export type ContentItemRow = {
  id: string;
  organization_id: string;
  client_id: string;
  status: ContentStatus;
  content_type: ContentType;
  title: string;
  hook_a: string | null;
  hook_b: string | null;
  hook_c: string | null;
  script: string | null;
  caption: string | null;
  visual_notes: string | null;
  bunny_video_id: string | null;
  bunny_video_status: BunnyVideoStatus | null;
  bunny_video_duration_seconds: number | null;
  planned_post_date: string | null; // ISO date YYYY-MM-DD
  published_at: string | null;
  position: number;
  visibility: Visibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentMetricsRow = {
  content_item_id: string;
  organization_id: string;
  client_id: string;
  views: number;
  likes: number;
  comments_count: number;
  shares: number;
  saves: number;
  reach: number | null;
  impressions: number | null;
  source: "manual" | "instagram_api";
  captured_at: string;
  updated_at: string;
};

export type ContentItemWithMetrics = ContentItemRow & {
  metrics: ContentMetricsRow | null;
};

/**
 * Fractional-rank "position" math for kanban reorder.
 *
 * Cards inside a column are ordered ascending by `position`. When a card
 * moves into a column at index `i`, we compute the midpoint between the
 * neighbours so the move is a single UPDATE with no whole-column rewrite.
 */
export function midpointPosition(
  prev: number | null,
  next: number | null,
): number {
  if (prev === null && next === null) return 1024;
  if (prev === null) return (next as number) - 1;
  if (next === null) return prev + 1;
  return (prev + next) / 2;
}

export function emptyHooks(item: ContentItemRow): boolean {
  return !item.hook_a && !item.hook_b && !item.hook_c;
}

export const METRIC_FIELDS = [
  "views",
  "likes",
  "comments_count",
  "shares",
  "saves",
] as const;
export type MetricField = (typeof METRIC_FIELDS)[number];

export const METRIC_LABEL: Record<MetricField, string> = {
  views: "Views",
  likes: "Likes",
  comments_count: "Comments",
  shares: "Shares",
  saves: "Saves",
};
