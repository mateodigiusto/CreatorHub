"use client";

import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { MAX_VIDEO_SECONDS } from "@/lib/mock/story";

export type UploadResult = {
  ok: boolean;
  tooLong?: boolean;
  error?: string;
};

async function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.src = url;
    v.onloadedmetadata = () => {
      const d = v.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : 0);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

export async function uploadAssetFile(file: File): Promise<UploadResult> {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) return { ok: false, error: "unsupported_type" };

  const baseTitle =
    file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "Untitled";
  const durationSeconds = isVideo ? await readVideoDuration(file) : undefined;

  const initRes = await fetch("/api/assets/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      kind: isVideo ? "video" : "photo",
      title: baseTitle,
      mimeType: file.type,
      sizeBytes: file.size,
      durationSeconds,
    }),
  });
  if (!initRes.ok) {
    const err = (await initRes.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: err.error ?? `init_${initRes.status}` };
  }
  const init = (await initRes.json()) as {
    assetId: string;
    path: string;
    token: string;
  };

  const supabase = getSupabaseBrowser();
  const { error: uploadErr } = await supabase.storage
    .from("originals")
    .uploadToSignedUrl(init.path, init.token, file, {
      contentType: file.type,
    });
  if (uploadErr) {
    return { ok: false, error: uploadErr.message };
  }

  const finalizeRes = await fetch(`/api/assets/${init.assetId}/finalize`, {
    method: "POST",
    credentials: "include",
  });
  if (!finalizeRes.ok) {
    const err = (await finalizeRes.json().catch(() => ({}))) as {
      error?: string;
    };
    return { ok: false, error: err.error ?? `finalize_${finalizeRes.status}` };
  }

  return {
    ok: true,
    tooLong: isVideo && (durationSeconds ?? 0) > MAX_VIDEO_SECONDS,
  };
}
