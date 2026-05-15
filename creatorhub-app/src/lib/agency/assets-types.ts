/**
 * TypeScript shapes for Phase 5 — assets (folders, links, videos), meetings,
 * and video/content comments.
 *
 * Mirrors columns from migration 0035 (Phase 3 — not yet committed at write
 * time, but verified against the staged SQL).
 */

export type FolderScope = "asset" | "sop";
export type Visibility = "internal" | "client_visible";

export type Folder = {
  id: string;
  organizationId: string;
  clientId: string;
  parentId: string | null;
  name: string;
  scope: FolderScope;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
};

export type FolderNode = Folder & { children: FolderNode[] };

export function buildFolderTree(rows: Folder[]): FolderNode[] {
  const byId = new Map<string, FolderNode>(
    rows.map((r) => [r.id, { ...r, children: [] }]),
  );
  const roots: FolderNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export const ASSET_CATEGORIES = [
  "journey",
  "pictures",
  "videos",
  "raw",
  "published",
  "other",
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const ASSET_CATEGORY_LABEL: Record<AssetCategory, string> = {
  journey: "Journey",
  pictures: "Pictures",
  videos: "External videos",
  raw: "Raw footage",
  published: "Published",
  other: "Other",
};

export type AssetLink = {
  id: string;
  organizationId: string;
  clientId: string;
  folderId: string | null;
  title: string;
  url: string;
  category: AssetCategory;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
};

export type BunnyVideoStatus = "uploading" | "processing" | "ready" | "failed";

export type ReviewStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved";

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
};

export type AssetVideo = {
  id: string;
  organizationId: string;
  clientId: string;
  folderId: string | null;
  title: string;
  bunnyVideoId: string | null;
  bunnyVideoStatus: BunnyVideoStatus;
  bunnyVideoDurationSeconds: number | null;
  reviewStatus: ReviewStatus;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
};

export type AssetVideoCreateResponse = {
  video: AssetVideo;
  upload: {
    endpoint: string;
    libraryId: string;
    videoId: string;
    authorizationSignature: string;
    authorizationExpire: number;
  };
};

export type AssetVideoStatusResponse = {
  video: AssetVideo;
  playback?: {
    hlsUrl: string;
    posterUrl: string;
  };
};

export type MeetingNote = {
  id: string;
  organizationId: string;
  clientId: string;
  meetingDate: string;
  title: string;
  body: string | null;
  attendees: string | null;
  actionItems: string | null;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
};

export type ContentComment = {
  id: string;
  organizationId: string;
  clientId: string;
  contentItemId: string | null;
  assetVideoId: string | null;
  parentId: string | null;
  authorId: string | null;
  authorEmail?: string | null;
  body: string;
  isInternal: boolean;
  timestampSeconds: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommentNode = ContentComment & { replies: CommentNode[] };

export function nestComments(rows: ContentComment[]): CommentNode[] {
  const byId = new Map<string, CommentNode>(
    rows.map((c) => [c.id, { ...c, replies: [] }]),
  );
  const roots: CommentNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  const byCreated = (a: ContentComment, b: ContentComment) =>
    a.createdAt.localeCompare(b.createdAt);
  const sort = (nodes: CommentNode[]) => {
    nodes.sort(byCreated);
    nodes.forEach((n) => sort(n.replies));
  };
  sort(roots);
  return roots;
}

export function formatTimecode(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return "";
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}
