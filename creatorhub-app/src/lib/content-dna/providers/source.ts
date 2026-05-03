/**
 * Per-platform source-ingestion: paste-a-URL → { transcript, metadata }.
 *
 * YouTube path: try the public auto-captions first (free, instant). Only
 * fall back to Apify+Whisper when captions are missing (some shorts, music
 * videos, copyright-blocked transcripts). Saves ~$0.05/analysis on the hot path.
 *
 * Instagram + TikTok paths: Apify scraper → metadata + downloadable mp4
 * URL → OpenAI Whisper. Captions on these platforms are rarely useful
 * (auto-generated subtitles aren't exposed via the public scrape).
 */

import { YoutubeTranscript } from "youtube-transcript";
import { runActor } from "./apify";
import { transcribe } from "./whisper";
import type { SourcePlatform } from "../types";

export type SourceResult = {
  transcript: string;
  title: string | null;
  creator: string | null;
  thumbnail: string | null;
};

export async function fetchSource(
  platform: SourcePlatform,
  url: string,
): Promise<SourceResult> {
  if (platform === "youtube") return fetchYouTube(url);
  if (platform === "instagram") return fetchInstagram(url);
  if (platform === "tiktok") return fetchTikTok(url);
  throw new Error(`unsupported_platform_${platform}`);
}

/* ────────── YouTube ────────── */

async function fetchYouTube(url: string): Promise<SourceResult> {
  const videoId = extractYouTubeVideoId(url);
  let transcript = "";
  if (videoId) {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId);
      transcript = items.map((i) => i.text).join(" ").trim();
    } catch {
      /* No captions available — fall through to Apify */
    }
  }

  const meta = videoId
    ? await fetchYouTubeOembed(videoId)
    : { title: null, creator: null, thumbnail: null };

  if (transcript) {
    return { transcript, ...meta };
  }

  /* Apify fallback for caption-less videos */
  type AYT = {
    title?: string;
    channelName?: string;
    thumbnailUrl?: string;
    text?: string;
    videoUrl?: string;
    url?: string;
  };
  const items = await runActor<AYT>("streamers/youtube-scraper", {
    startUrls: [{ url }],
    maxItems: 1,
  });
  const item = items[0];
  if (!item) throw new Error("youtube_no_data");
  let fallbackTranscript = item.text ?? "";
  const downloadUrl = item.videoUrl ?? item.url;
  if (!fallbackTranscript && downloadUrl) {
    fallbackTranscript = await transcribe(downloadUrl);
  }
  if (!fallbackTranscript) throw new Error("youtube_no_transcript");
  return {
    transcript: fallbackTranscript,
    title: item.title ?? meta.title,
    creator: item.channelName ?? meta.creator,
    thumbnail: item.thumbnailUrl ?? meta.thumbnail,
  };
}

/* ────────── Instagram ────────── */

async function fetchInstagram(url: string): Promise<SourceResult> {
  type AIG = {
    caption?: string;
    ownerUsername?: string;
    displayUrl?: string;
    videoUrl?: string;
    type?: string;
  };
  const items = await runActor<AIG>("apify/instagram-scraper", {
    directUrls: [url],
    resultsType: "details",
    resultsLimit: 1,
  });
  const item = items[0];
  if (!item) throw new Error("instagram_no_data");

  let transcript = "";
  if (item.videoUrl) {
    try {
      transcript = await transcribe(item.videoUrl);
    } catch {
      /* Whisper might fail (size cap, fetch error). Use caption as last resort. */
    }
  }
  if (!transcript) transcript = item.caption ?? "";
  if (!transcript) throw new Error("instagram_no_transcript");

  return {
    transcript,
    title: item.caption?.slice(0, 80).trim() ?? null,
    creator: item.ownerUsername ?? null,
    thumbnail: item.displayUrl ?? null,
  };
}

/* ────────── TikTok ────────── */

async function fetchTikTok(url: string): Promise<SourceResult> {
  type ATT = {
    text?: string;
    authorMeta?: { name?: string; nickName?: string };
    videoMeta?: {
      downloadAddr?: string;
      coverUrl?: string;
      cover?: string;
    };
  };
  const items = await runActor<ATT>("clockworks/free-tiktok-scraper", {
    postURLs: [url],
    resultsPerPage: 1,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });
  const item = items[0];
  if (!item) throw new Error("tiktok_no_data");

  const downloadUrl = item.videoMeta?.downloadAddr;
  let transcript = "";
  if (downloadUrl) {
    try {
      transcript = await transcribe(downloadUrl);
    } catch {
      /* Fall through to caption */
    }
  }
  if (!transcript) transcript = item.text ?? "";
  if (!transcript) throw new Error("tiktok_no_transcript");

  return {
    transcript,
    title: item.text?.slice(0, 80).trim() ?? null,
    creator: item.authorMeta?.nickName ?? item.authorMeta?.name ?? null,
    thumbnail: item.videoMeta?.coverUrl ?? item.videoMeta?.cover ?? null,
  };
}

/* ────────── Helpers ────────── */

function extractYouTubeVideoId(url: string): string | null {
  const re =
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/;
  const m = url.match(re);
  return m ? m[1] : null;
}

async function fetchYouTubeOembed(videoId: string): Promise<{
  title: string | null;
  creator: string | null;
  thumbnail: string | null;
}> {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!r.ok) return { title: null, creator: null, thumbnail: null };
    const json = (await r.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      title: json.title ?? null,
      creator: json.author_name ?? null,
      thumbnail: json.thumbnail_url ?? null,
    };
  } catch {
    return { title: null, creator: null, thumbnail: null };
  }
}
