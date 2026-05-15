/**
 * `/workspace/assets` — client-visible files for this creator.
 *
 * Reads `asset_links` and `asset_videos` filtered by RLS to
 * `visibility='client_visible'` (the policy on those tables already
 * enforces this for non-staff). Renders a flat list grouped by category.
 *
 * Phase 5 is the owner of the full Assets UX (folder tree, TUS upload,
 * video review states). This page renders a simpler "library shelf"
 * view that works with whatever rows have already been promoted to
 * `client_visible` by the agency. When Phase 5 lands, swap to its
 * richer browser component.
 */

import Link from "next/link";
import { ExternalLink, FileVideo, Link2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  journey: "Journey",
  pictures: "Pictures",
  videos: "Videos",
  raw: "Raw",
  published: "Published",
  other: "Other",
};

type LinkRow = {
  id: string;
  title: string;
  url: string;
  category: string;
  created_at: string;
};

type VideoRow = {
  id: string;
  title: string;
  bunny_video_id: string | null;
  bunny_video_status: string;
  review_status: string;
  bunny_video_duration_seconds: number | null;
  created_at: string;
};

export default async function WorkspaceAssetsPage() {
  const viewer = await requireWorkspaceAccess();
  const supabase = await getSupabaseServer();

  const [{ data: linkRows }, { data: videoRows }] = await Promise.all([
    supabase
      .from("asset_links")
      .select("id, title, url, category, created_at")
      .eq("client_id", viewer.client.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("asset_videos")
      .select(
        "id, title, bunny_video_id, bunny_video_status, review_status, bunny_video_duration_seconds, created_at",
      )
      .eq("client_id", viewer.client.id)
      .order("created_at", { ascending: false }),
  ]);

  const links = (linkRows ?? []) as LinkRow[];
  const videos = (videoRows ?? []) as VideoRow[];

  const linksByCategory = links.reduce<Record<string, LinkRow[]>>((acc, l) => {
    (acc[l.category] ||= []).push(l);
    return acc;
  }, {});

  const empty = links.length === 0 && videos.length === 0;

  return (
    <div className="p-6">
      <PageHeader
        title="Assets"
        description="Files, links, and videos your team has shared with you."
      />

      {empty ? (
        <EmptyState
          title="Nothing shared yet"
          description="When your team marks an asset client-visible, it'll appear here."
        />
      ) : (
        <div className="space-y-6">
          {videos.length > 0 && (
            <section>
              <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
                Videos
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {videos.map((v) => (
                  <VideoRowCard key={v.id} row={v} />
                ))}
              </div>
            </section>
          )}

          {Object.entries(linksByCategory).map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
                {CATEGORY_LABEL[category] ?? category}
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {items.map((l) => (
                  <Link
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Card lift className="flex items-start gap-3">
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-accent-soft text-accent">
                        <Link2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-text">
                          {l.title}
                        </p>
                        <p className="truncate text-[12.5px] text-muted">
                          {l.url}
                        </p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 flex-none text-muted" />
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoRowCard({ row }: { row: VideoRow }) {
  const ready = row.bunny_video_status === "ready";
  return (
    <Card className="flex items-start gap-3">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-accent-soft text-accent">
        <FileVideo className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-text">
          {row.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tone={ready ? "green" : "neutral"}>
            {row.bunny_video_status}
          </Badge>
          <Badge tone="accent">{row.review_status.replace("_", " ")}</Badge>
          {row.bunny_video_duration_seconds != null && (
            <span className="text-[11.5px] text-muted">
              {Math.round(row.bunny_video_duration_seconds)}s
            </span>
          )}
        </div>
        {!ready && (
          <p className="mt-1 text-[12px] text-muted">
            Playback opens once processing finishes.
          </p>
        )}
      </div>
    </Card>
  );
}
