"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Link2,
  ArrowRight,
  Wand2,
  Eye,
  Layers3,
  Compass,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/cn";

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

export default function ContentDnaPage() {
  const router = useRouter();
  const { connected, showToast } = useAppState();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [analyses, setAnalyses] = useState<ApiAnalysis[] | null>(null);

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

  async function startAnalysis(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || submitting) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      showToast("Paste a full URL — must start with https://");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/content-dna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: trimmed }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        showToast(`Couldn't analyze: ${err.error ?? r.status}`);
        setSubmitting(false);
        return;
      }
      const json = (await r.json()) as { id: string };
      router.push(`/content-dna/${json.id}`);
    } catch {
      showToast("Network error. Try again.");
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
        <h2 className="text-[24px] font-semibold tracking-[-0.015em] text-text leading-tight">
          Structural clone. Content original.
        </h2>
        <p className="text-[13.5px] text-muted mt-1.5 leading-relaxed max-w-[640px]">
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
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…  ·  https://www.instagram.com/reel/…"
              className="w-full h-11 pl-9 pr-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <Button type="submit" disabled={!url.trim() || submitting} size="md">
            <Wand2 className="w-3.5 h-3.5" />
            {submitting ? "Analyzing…" : "Analyze"}
          </Button>
        </form>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" disabled>
            Notify me
          </Button>
        </div>
      </Card>

      {/* Recent analyses */}
      <Card padded={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text">
              Recent breakdowns
            </h3>
            <p className="text-[12.5px] text-muted mt-0.5">
              Pick up where you left off.
            </p>
          </div>
          <span className="text-[11.5px] text-muted tabular-nums">
            {analyses === null ? "" : `${analyses.length} total`}
          </span>
        </div>
        {analyses === null ? (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[120px] rounded-[12px] bg-surface-2 border border-border animate-pulse"
              />
            ))}
          </div>
        ) : analyses.length === 0 ? (
          <div className="p-5">
            <div className="text-[13px] text-muted">
              Nothing yet. Drop a link above to start your first breakdown.
            </div>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analyses.map((a) => (
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

function RecentTile({
  analysis,
  onClick,
}: {
  analysis: ApiAnalysis;
  onClick: () => void;
}) {
  const gradient =
    analysis.source_thumbnail ?? "linear-gradient(135deg,#0F172A,#3B82F6)";
  const platform = analysis.source_platform.toUpperCase();
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
          <span
            className="bg-black/30 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
            style={{ letterSpacing: "0.06em" }}
          >
            {platform}
          </span>
        </div>
      </div>
      <div className="px-3.5 py-3">
        <div className="text-[13.5px] font-semibold text-text truncate">
          {analysis.source_title ?? "Untitled video"}
        </div>
        <div className="text-[11.5px] text-muted mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate">{analysis.source_creator ?? ""}</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted shrink-0" />
        </div>
      </div>
    </button>
  );
}
