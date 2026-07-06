"use client";

/**
 * Grid of asset videos for a folder. Polls non-terminal videos every 5s
 * until they reach ready/failed. Plays via <BunnyVideoPlayer>. Click
 * "Comments" to reveal the threaded timestamp-anchored discussion below
 * the player.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Trash2, AlertTriangle, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BunnyVideoPlayer } from "@/components/ui/VideoPlayer";
import { VideoCommentThread } from "@/components/agency/assets/VideoCommentThread";
import { AssetVideoUploader } from "@/components/agency/assets/AssetVideoUploader";
import {
  REVIEW_STATUS_LABEL,
  type AssetVideo,
  type AssetVideoStatusResponse,
  type ReviewStatus,
} from "@/lib/agency/assets-types";

type Props = {
  slug: string;
  folderId: string | null;
};

const POLL_INTERVAL_MS = 5000;

export function AssetVideoList({ slug, folderId }: Props) {
  const [videos, setVideos] = useState<AssetVideo[]>([]);
  const [playback, setPlayback] = useState<
    Record<string, { hlsUrl: string; posterUrl: string }>
  >({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const qs = folderId ? `?folderId=${folderId}` : "";
    const res = await fetch(`/api/clients/${slug}/assets/videos${qs}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const body = (await res.json()) as { videos: AssetVideo[] };
      setVideos(body.videos);
    }
    setLoading(false);
  }, [slug, folderId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    void load();
  }, [load]);

  useEffect(() => {
    const pending = videos.filter(
      (v) =>
        v.bunnyVideoStatus !== "ready" && v.bunnyVideoStatus !== "failed",
    );
    if (pending.length === 0) return;
    const handle = window.setInterval(async () => {
      for (const v of pending) {
        try {
          const res = await fetch(
            `/api/clients/${slug}/assets/videos/${v.id}`,
            { cache: "no-store" },
          );
          if (!res.ok) continue;
          const body = (await res.json()) as AssetVideoStatusResponse;
          setVideos((prev) =>
            prev.map((x) => (x.id === v.id ? body.video : x)),
          );
          if (body.playback) {
            setPlayback((prev) => ({ ...prev, [v.id]: body.playback! }));
          }
        } catch {
          // retry next tick
        }
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [videos, slug]);

  const onUploaded = (video: AssetVideo) => {
    setVideos((prev) => [video, ...prev]);
  };

  const setReviewStatus = async (id: string, status: ReviewStatus) => {
    const before = videos;
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, reviewStatus: status } : v)),
    );
    const res = await fetch(`/api/clients/${slug}/assets/videos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus: status }),
    });
    if (!res.ok) setVideos(before);
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this video?")) return;
    setVideos((prev) => prev.filter((v) => v.id !== id));
    setOpenId((prev) => (prev === id ? null : prev));
    await fetch(`/api/clients/${slug}/assets/videos/${id}`, {
      method: "DELETE",
    });
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3 gap-3">
        <h3 className="text-[14.5px] font-semibold text-text">Videos</h3>
        <AssetVideoUploader
          slug={slug}
          folderId={folderId}
          onUploaded={onUploaded}
        />
      </div>

      {loading ? (
        <p className="text-[13px] text-muted py-4">Loading…</p>
      ) : videos.length === 0 ? (
        <EmptyState
          title="No videos yet"
          description="Upload raw or edited cuts here — the team can leave timestamped feedback."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              playback={playback[v.id]}
              isOpen={openId === v.id}
              onToggleOpen={() =>
                setOpenId((prev) => (prev === v.id ? null : v.id))
              }
              onChangeStatus={(s) => setReviewStatus(v.id, s)}
              onDelete={() => remove(v.id)}
              slug={slug}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function VideoCard({
  video,
  playback,
  isOpen,
  onToggleOpen,
  onChangeStatus,
  onDelete,
  slug,
}: {
  video: AssetVideo;
  playback?: { hlsUrl: string; posterUrl: string };
  isOpen: boolean;
  onToggleOpen: () => void;
  onChangeStatus: (s: ReviewStatus) => void;
  onDelete: () => void;
  slug: string;
}) {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  return (
    <div className="rounded-md border border-border bg-surface-2 overflow-hidden">
      <div className="aspect-video bg-black/80 relative">
        {video.bunnyVideoStatus === "ready" && playback ? (
          <BunnyVideoPlayer
            ref={playerRef}
            hlsUrl={playback.hlsUrl}
            posterUrl={playback.posterUrl}
            title={video.title}
          />
        ) : video.bunnyVideoStatus === "failed" ? (
          <div className="absolute inset-0 grid place-items-center text-amber-700">
            <div className="flex flex-col items-center gap-1.5">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-[12px]">Upload failed</span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted">
            <div className="flex flex-col items-center gap-1.5">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[11.5px] capitalize">
                {video.bunnyVideoStatus}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13.5px] font-medium text-text leading-snug truncate flex-1">
            {video.title}
          </p>
          <button
            type="button"
            onClick={onDelete}
            className="text-muted hover:text-[var(--error)]"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={video.reviewStatus}
            onChange={(e) => onChangeStatus(e.target.value as ReviewStatus)}
            className="bg-surface border border-border rounded px-1.5 py-0.5 text-[11.5px] outline-none"
          >
            {(
              ["draft", "in_review", "changes_requested", "approved"] as ReviewStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {REVIEW_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <Badge
            tone={video.visibility === "client_visible" ? "accent" : "neutral"}
          >
            {video.visibility === "client_visible" ? "Client" : "Internal"}
          </Badge>
          <button
            type="button"
            onClick={onToggleOpen}
            className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-accent"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {isOpen ? "Hide comments" : "Comments"}
          </button>
        </div>
        {isOpen && (
          <VideoCommentThread
            slug={slug}
            videoId={video.id}
            onSeek={(seconds) => {
              const el = playerRef.current;
              if (el) {
                el.currentTime = seconds;
                void el.play().catch(() => undefined);
              }
            }}
            getCurrentTime={() => playerRef.current?.currentTime ?? null}
          />
        )}
      </div>
    </div>
  );
}
