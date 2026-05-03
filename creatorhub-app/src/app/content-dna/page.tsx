"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Link2,
  ArrowRight,
  Wand2,
  Eye,
  Layers3,
  Compass,
  Search,
  PlaySquare,
  Camera,
  Music,
  Globe,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/cn";
import { detectPlatform, canonicalizeUrl } from "@/lib/content-dna/stubs";
import type { SourcePlatform } from "@/lib/content-dna/types";

type ApiAnalysis = {
  id: string;
  source_url: string;
  source_platform: string;
  source_title: string | null;
  source_creator: string | null;
  source_thumbnail: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type SortKey = "newest" | "oldest" | "title";

const SAMPLE_URLS = [
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://www.instagram.com/reel/CxAmPLE/",
  "https://www.tiktok.com/@creator/video/7321",
];

export default function ContentDnaPage() {
  const router = useRouter();
  const { connected, showToast } = useAppState();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<ApiAnalysis[] | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const loadAnalyses = useCallback(async () => {
    try {
      const r = await fetch("/api/content-dna", { credentials: "include" });
      if (!r.ok) {
        setAnalyses([]);
        return;
      }
      const json = (await r.json()) as { analyses: ApiAnalysis[] };
      setAnalyses(json.analyses);
    } catch {
      setAnalyses([]);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void loadAnalyses();
  }, [loadAnalyses]);

  /* Live URL preview — runs on every keystroke. Cheap, pure, no fetch. */
  const urlPreview = useMemo(() => {
    const trimmed = url.trim();
    if (!trimmed) return null;
    const canonical = canonicalizeUrl(trimmed);
    if (!canonical) return { valid: false as const };
    return { valid: true as const, canonical, platform: detectPlatform(canonical) };
  }, [url]);

  const filteredAnalyses = useMemo(() => {
    if (!analyses) return null;
    const q = search.trim().toLowerCase();
    const out = q
      ? analyses.filter((a) => {
          return (
            (a.source_title ?? "").toLowerCase().includes(q) ||
            (a.source_creator ?? "").toLowerCase().includes(q) ||
            a.source_platform.toLowerCase().includes(q) ||
            a.source_url.toLowerCase().includes(q)
          );
        })
      : analyses.slice();
    if (sort === "newest") {
      out.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    } else if (sort === "oldest") {
      out.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    } else if (sort === "title") {
      out.sort((a, b) => (a.source_title ?? "").localeCompare(b.source_title ?? ""));
    }
    return out;
  }, [analyses, search, sort]);

  async function startAnalysis(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const trimmed = url.trim();
    if (!trimmed || submitting) return;
    if (urlPreview?.valid !== true) {
      setSubmitError("That doesn't look like a video URL. Try a YouTube, Instagram, or TikTok link.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/content-dna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: urlPreview.canonical }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        if (err.error === "invalid_url") {
          setSubmitError("URL didn't parse. Paste the full link including https://.");
        } else if (err.error === "unauthorized") {
          setSubmitError("You're signed out. Refresh and try again.");
        } else {
          setSubmitError(`Couldn't analyze: ${err.error ?? r.status}`);
        }
        setSubmitting(false);
        return;
      }
      const json = (await r.json()) as { id: string; deduped?: boolean };
      if (json.deduped) {
        showToast("You analyzed this URL recently — opening that breakdown.");
      }
      router.push(`/content-dna/${json.id}`);
    } catch {
      setSubmitError("Network error. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (!connected) {
    return (
      <>
        <PageHeader
          title="Content DNA"
          description="Reverse-engineer the structure of any viral video. Then build your own."
        />
        <EmptyState
          title="Connect a platform first."
          description="Content DNA pairs your library and reports with structural analyses of the videos you want to learn from."
          primaryAction={{ label: "Connect a platform" }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Content DNA"
        description="Paste a competitor video. We extract the structure. You build the original."
      />

      {/* Hero / paste form */}
      <Card className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-flex items-center gap-1 text-[10.5px] uppercase font-semibold text-accent bg-accent-soft border border-accent-border px-1.5 py-0.5 rounded"
            style={{ letterSpacing: "0.08em" }}
          >
            <Sparkles className="w-3 h-3" /> Three-step engine
          </span>
        </div>
        <h2 className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.015em] text-text leading-tight">
          Structural clone. Content original.
        </h2>
        <p className="text-[13px] sm:text-[13.5px] text-muted mt-1.5 leading-relaxed max-w-[640px]">
          Drop a YouTube, Instagram, or TikTok link. We extract the hook, beat
          structure, and what made it work — then you build your own version
          with a different angle and audience.
        </p>

        <form onSubmit={startAnalysis} className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (submitError) setSubmitError(null);
              }}
              placeholder="https://www.youtube.com/watch?v=…  ·  https://www.instagram.com/reel/…"
              className={cn(
                "w-full h-11 pl-9 pr-24 rounded-[10px] bg-surface border text-[13.5px] text-text focus:outline-none focus:ring-2",
                urlPreview?.valid === false
                  ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20"
                  : "border-border focus:border-accent/40 focus:ring-accent/20",
              )}
            />
            {urlPreview?.valid && (
              <PlatformPill
                platform={urlPreview.platform}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              />
            )}
          </div>
          <Button
            type="submit"
            disabled={!url.trim() || submitting || urlPreview?.valid !== true}
            size="md"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {submitting ? "Analyzing…" : "Analyze"}
          </Button>
        </form>
        {submitError && (
          <div className="mt-2 inline-flex items-start gap-1.5 text-[12px] text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}
        {!url.trim() && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
            <span>Try one of these:</span>
            {SAMPLE_URLS.map((s) => (
              <button
                key={s}
                onClick={() => setUrl(s)}
                className="px-2 py-0.5 rounded border border-border bg-surface-2 text-text/80 hover:text-text hover:border-accent/25 cursor-pointer truncate max-w-[40ch]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <FlowChip
            step="01"
            icon={<Eye className="w-3.5 h-3.5" />}
            title="Import"
            description="Transcription, hook, beat structure, why it worked."
          />
          <FlowChip
            step="02"
            icon={<Layers3 className="w-3.5 h-3.5" />}
            title="Rebuild"
            description="Same pattern. Variations of hooks, angles, titles."
          />
          <FlowChip
            step="03"
            icon={<Compass className="w-3.5 h-3.5" />}
            title="Build"
            description="Your angle in. Full script, hooks, shots, captions out."
          />
        </div>
      </Card>

      {/* AI-discover mode (deferred) */}
      <Card className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text">
                Discover relevant creators
              </h3>
              <Badge tone="neutral">Coming soon</Badge>
            </div>
            <p className="text-[12.5px] text-muted mt-1 leading-snug max-w-prose">
              Tell us your niche and we&rsquo;ll surface 5–10 creators worth
              breaking down — never random accounts. Drops in alongside the
              real LLM integration.
            </p>
          </div>
          <Button variant="outline" size="sm" disabled className="self-start">
            Notify me
          </Button>
        </div>
      </Card>

      {/* Recent analyses */}
      <Card padded={false}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text">
              Recent breakdowns
            </h3>
            <p className="text-[12.5px] text-muted mt-0.5">
              Pick up where you left off.
            </p>
          </div>
          {analyses && analyses.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full sm:w-[180px] h-8 pl-8 pr-2.5 rounded-[8px] bg-surface-2 border border-border text-[12.5px] text-text focus:outline-none focus:border-accent/40"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-8 px-2.5 rounded-[8px] bg-surface-2 border border-border text-[12.5px] text-text focus:outline-none focus:border-accent/40 cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="title">A–Z</option>
              </select>
            </div>
          )}
        </div>
        {analyses === null ? (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[140px] rounded-[12px] bg-surface-2 border border-border animate-pulse"
              />
            ))}
          </div>
        ) : analyses.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-[13px] text-text font-medium">
              Nothing here yet.
            </div>
            <div className="text-[12px] text-muted mt-1 max-w-[420px] mx-auto">
              Drop a link above to start your first breakdown. We&rsquo;ll
              extract the hook, beat structure, and what made it work — in
              about 10 seconds.
            </div>
          </div>
        ) : filteredAnalyses?.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-[13px] text-text font-medium">
              No breakdowns match &ldquo;{search}&rdquo;.
            </div>
            <button
              onClick={() => setSearch("")}
              className="text-[12px] text-accent hover:text-accent-2 font-medium mt-1.5 cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAnalyses!.map((a) => (
              <RecentTile
                key={a.id}
                analysis={a}
                onClick={() => router.push(`/content-dna/${a.id}`)}
              />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function FlowChip({
  step,
  icon,
  title,
  description,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[12px] border border-border px-3.5 py-3 bg-surface card-base">
      <div className="flex items-center gap-2">
        <span
          className="text-[10.5px] uppercase font-semibold text-muted"
          style={{ letterSpacing: "0.08em" }}
        >
          Step {step}
        </span>
        <div className="w-5 h-5 rounded-md grid place-items-center bg-surface-3 text-muted">
          {icon}
        </div>
      </div>
      <div className="text-[13px] font-semibold text-text mt-1.5 tracking-[-0.005em]">
        {title}
      </div>
      <p className="text-[11.5px] text-muted leading-snug mt-0.5">{description}</p>
    </div>
  );
}

function PlatformPill({
  platform,
  className,
}: {
  platform: SourcePlatform;
  className?: string;
}) {
  const config = PLATFORM_CONFIG[platform];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase px-1.5 py-0.5 rounded",
        config.classes,
        className,
      )}
      style={{ letterSpacing: "0.06em" }}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

const PLATFORM_CONFIG: Record<
  SourcePlatform,
  { label: string; icon: React.ReactNode; classes: string }
> = {
  youtube: {
    label: "YouTube",
    icon: <PlaySquare className="w-3 h-3" />,
    classes: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  },
  instagram: {
    label: "Instagram",
    icon: <Camera className="w-3 h-3" />,
    classes: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20",
  },
  tiktok: {
    label: "TikTok",
    icon: <Music className="w-3 h-3" />,
    classes: "bg-text/10 text-text border border-text/20",
  },
  other: {
    label: "Other",
    icon: <Globe className="w-3 h-3" />,
    classes: "bg-surface-2 text-muted border border-border",
  },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.round(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function RecentTile({
  analysis,
  onClick,
}: {
  analysis: ApiAnalysis;
  onClick: () => void;
}) {
  const gradient =
    analysis.source_thumbnail ?? "linear-gradient(135deg,#0F172A,#3B82F6)";
  const platform = (analysis.source_platform as SourcePlatform) ?? "other";
  return (
    <button
      onClick={onClick}
      className={cn(
        "lift block w-full text-left rounded-[12px] border border-border bg-surface card-base overflow-hidden cursor-pointer",
      )}
    >
      <div className="aspect-[16/8] relative" style={{ background: gradient }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute top-2 left-2">
          <PlatformPill platform={platform} className="!bg-black/35 !text-white !border-white/20" />
        </div>
      </div>
      <div className="px-3.5 py-3">
        <div className="text-[13.5px] font-semibold text-text truncate">
          {analysis.source_title ?? "Untitled video"}
        </div>
        <div className="text-[11.5px] text-muted mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate">
            {analysis.source_creator ?? ""} · {timeAgo(analysis.created_at)}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted shrink-0" />
        </div>
      </div>
    </button>
  );
}
