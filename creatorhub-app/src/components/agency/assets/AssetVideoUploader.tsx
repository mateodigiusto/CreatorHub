"use client";

/**
 * Drop a video file → server creates Bunny shell + DB row → browser drives
 * resumable TUS upload directly to Bunny → optimistic row added to the list,
 * which polls for status.
 */

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  type AssetVideo,
  type AssetVideoCreateResponse,
  type Visibility,
} from "@/lib/agency/assets-types";
import { startBunnyTusUpload } from "@/lib/bunny/tus";

type Props = {
  slug: string;
  folderId: string | null;
  defaultVisibility?: Visibility;
  onUploaded: (video: AssetVideo) => void;
};

type ActiveUpload = {
  fileName: string;
  loaded: number;
  total: number;
  abort: () => void;
  videoId: string;
};

export function AssetVideoUploader({
  slug,
  folderId,
  defaultVisibility = "internal",
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState<ActiveUpload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("video/")) {
      setError("Pick a video file (MP4, MOV, etc.).");
      return;
    }

    const createRes = await fetch(`/api/clients/${slug}/assets/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: file.name.replace(/\.[^/.]+$/, "").slice(0, 200),
        folderId,
        visibility: defaultVisibility,
      }),
    });

    if (!createRes.ok) {
      const body = await createRes.json().catch(() => ({}));
      setError(body.error ?? "upload_setup_failed");
      return;
    }
    const created = (await createRes.json()) as AssetVideoCreateResponse;
    onUploaded(created.video);

    try {
      const { abort } = await startBunnyTusUpload(file, created.upload, {
        onProgress: (loaded, total) =>
          setActive((prev) =>
            prev && prev.videoId === created.video.id
              ? { ...prev, loaded, total }
              : prev,
          ),
        onSuccess: () => setActive(null),
        onError: (err) => {
          setError(`Upload failed: ${err.message}`);
          setActive(null);
        },
      });

      setActive({
        fileName: file.name,
        loaded: 0,
        total: file.size,
        abort,
        videoId: created.video.id,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload_failed");
    }
  };

  const pct =
    active && active.total > 0
      ? Math.min(100, Math.round((active.loaded / active.total) * 100))
      : 0;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPick(f);
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={!!active}
      >
        <Upload className="w-3.5 h-3.5" />
        Upload video
      </Button>

      {active && (
        <div className="p-3 rounded-md bg-surface-2 border border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12.5px] text-text truncate">
              {active.fileName}
            </span>
            <button
              type="button"
              onClick={() => {
                active.abort();
                setActive(null);
              }}
              className="text-[11px] text-muted hover:text-[var(--error)]"
            >
              Cancel
            </button>
          </div>
          <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full bg-accent transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted mt-1 tabular-nums">{pct}%</p>
        </div>
      )}

      {error && <p className="text-[12px] text-[var(--error)]">{error}</p>}
    </div>
  );
}
