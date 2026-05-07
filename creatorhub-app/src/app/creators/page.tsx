"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bookmark,
  BookmarkCheck,
  Send,
  ArrowRight,
  Wand2,
  X,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/cn";
import type { Platform } from "@/lib/onboarding/types";

type FollowerRange = "under_10k" | "10k_50k" | "50k_250k" | "250k_1m" | "over_1m";
type PostingFrequency = "rarely" | "weekly" | "few_per_week" | "daily" | "multi_daily";
type TargetStatus = "pitched" | "responded" | "client" | "pass";

type Creator = {
  id: string;
  handle: string;
  display_name: string | null;
  primary_platform: Platform;
  niche: string;
  follower_range: FollowerRange | null;
  platforms: Platform[];
  posting_frequency: PostingFrequency | null;
  bio: string | null;
};

const FOLLOWER_LABELS: Record<FollowerRange, string> = {
  under_10k: "Under 10k",
  "10k_50k": "10k–50k",
  "50k_250k": "50k–250k",
  "250k_1m": "250k–1M",
  over_1m: "Over 1M",
};

const FREQ_LABELS: Record<PostingFrequency, string> = {
  rarely: "Rarely",
  weekly: "Weekly",
  few_per_week: "Few × week",
  daily: "Daily",
  multi_daily: "Multi-daily",
};

const TARGET_TONE: Record<TargetStatus, "accent" | "green" | "neutral"> = {
  pitched: "accent",
  responded: "accent",
  client: "green",
  pass: "neutral",
};

export default function CreatorsDirectoryPage() {
  const router = useRouter();
  const { showToast } = useAppState();
  const [creators, setCreators] = useState<Creator[] | null>(null);
  const [targetStatusByCreator, setTargetStatusByCreator] = useState<Record<string, TargetStatus>>({});
  const [niche, setNiche] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [followerRange, setFollowerRange] = useState<string>("");
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [outreachFor, setOutreachFor] = useState<Creator | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (niche) params.set("niche", niche);
    if (platform) params.set("platform", platform);
    if (followerRange) params.set("follower_range", followerRange);
    if (q.trim()) params.set("q", q.trim());
    try {
      const res = await fetch(`/api/creators?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setCreators([]);
        return;
      }
      const json = (await res.json()) as {
        creators: Creator[];
        targetStatusByCreator: Record<string, TargetStatus>;
      };
      setCreators(json.creators);
      setTargetStatusByCreator(json.targetStatusByCreator);
    } catch {
      setCreators([]);
    }
  }, [niche, platform, followerRange, q]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  const niches = useMemo(() => {
    if (!creators) return [];
    return Array.from(new Set(creators.map((c) => c.niche))).sort();
  }, [creators]);

  async function saveTarget(creatorId: string) {
    if (savingId) return;
    setSavingId(creatorId);
    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ creatorId, status: "pitched" }),
      });
      if (!res.ok) {
        showToast("Couldn't save target. Try again.");
        return;
      }
      setTargetStatusByCreator((prev) => ({ ...prev, [creatorId]: "pitched" }));
      showToast("Saved to target list");
    } catch {
      showToast("Network error. Try again.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Creator directory"
        description="Curated by the CreatorHub team. Filter by niche, platform, and follower range to find your next pitch targets."
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/outreach")}>
            <Send className="w-3.5 h-3.5" /> View target list
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search handle, name, or niche…"
              className="w-full h-10 pl-9 pr-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 cursor-pointer"
          >
            <option value="">All platforms</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="linkedin">LinkedIn</option>
            <option value="x">X / Twitter</option>
            <option value="facebook">Facebook</option>
          </select>
          <select
            value={followerRange}
            onChange={(e) => setFollowerRange(e.target.value)}
            className="h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 cursor-pointer"
          >
            <option value="">All sizes</option>
            {(Object.keys(FOLLOWER_LABELS) as FollowerRange[]).map((r) => (
              <option key={r} value={r}>{FOLLOWER_LABELS[r]}</option>
            ))}
          </select>
        </div>

        {niches.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11.5px] text-muted mr-1">Niche:</span>
            <button
              onClick={() => setNiche("")}
              className={cn(
                "px-2 py-0.5 rounded-full text-[11.5px] border cursor-pointer transition-colors",
                !niche
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-border text-muted hover:border-accent/30 hover:text-text",
              )}
            >
              All
            </button>
            {niches.map((n) => (
              <button
                key={n}
                onClick={() => setNiche(n)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11.5px] border cursor-pointer transition-colors",
                  niche === n
                    ? "border-accent/40 bg-accent-soft text-accent"
                    : "border-border text-muted hover:border-accent/30 hover:text-text",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </Card>

      {creators === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[160px] rounded-[14px] bg-surface-2 border border-border animate-pulse"
            />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <EmptyState
          title="No creators match your filters."
          description="Adjust the filters above, or clear the search to browse the full directory."
          showSampleDataCta={false}
          primaryAction={{
            label: "Clear filters",
            onClick: () => {
              setNiche("");
              setPlatform("");
              setFollowerRange("");
              setQ("");
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {creators.map((c) => {
            const targetStatus = targetStatusByCreator[c.id];
            const saved = !!targetStatus;
            return (
              <Card key={c.id} className="lift cursor-default">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-text truncate">
                      {c.display_name ?? c.handle}
                    </div>
                    <div className="text-[12px] text-muted truncate">
                      {c.handle}
                    </div>
                  </div>
                  {saved && (
                    <Badge tone={TARGET_TONE[targetStatus]}>{targetStatus}</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  <Badge tone="neutral">{c.niche}</Badge>
                  {c.follower_range && (
                    <Badge tone="neutral">{FOLLOWER_LABELS[c.follower_range]}</Badge>
                  )}
                  {c.posting_frequency && (
                    <Badge tone="neutral">{FREQ_LABELS[c.posting_frequency]}</Badge>
                  )}
                </div>

                {c.bio && (
                  <p className="text-[12.5px] text-muted leading-relaxed line-clamp-2 mb-3">
                    {c.bio}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                  <div className="text-[11px] text-muted capitalize">
                    {c.platforms.slice(0, 3).join(" · ")}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOutreachFor(c)}
                      title="Generate personalized outreach"
                    >
                      <Wand2 className="w-3.5 h-3.5" /> Outreach
                    </Button>
                    <Button
                      size="sm"
                      variant={saved ? "outline" : "primary"}
                      onClick={() => saveTarget(c.id)}
                      disabled={saved || savingId === c.id}
                    >
                      {saved ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5" /> Saved
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          {savingId === c.id ? "Saving…" : "Save"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {outreachFor && (
        <OutreachModal
          creator={outreachFor}
          onClose={() => setOutreachFor(null)}
        />
      )}
    </>
  );
}

/* ─── Outreach generation modal ──────────────────────────────────── */

type OutreachMethod = "dm" | "email" | "comment" | "voice_note";

type OutreachDraft = {
  subject: string;
  message: string;
  rationale: string;
  references: string[];
};

const METHOD_LABELS: Record<OutreachMethod, string> = {
  dm: "DM",
  email: "Email",
  comment: "Comment",
  voice_note: "Voice note",
};

function OutreachModal({
  creator,
  onClose,
}: {
  creator: Creator;
  onClose: () => void;
}) {
  const { showToast } = useAppState();
  const [method, setMethod] = useState<OutreachMethod>("dm");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<OutreachDraft | null>(null);
  const [needsTranscripts, setNeedsTranscripts] = useState(false);
  const [provider, setProvider] = useState<"claude" | "stub" | null>(null);
  const [copied, setCopied] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  async function generate() {
    if (generating) return;
    setGenerating(true);
    setDraft(null);
    setNeedsTranscripts(false);
    try {
      const res = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ creatorId: creator.id, method }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(`Couldn't generate: ${err.error ?? res.status}`);
        return;
      }
      const json = (await res.json()) as {
        draft: OutreachDraft;
        provider: "claude" | "stub";
        needsTranscripts: boolean;
      };
      setDraft(json.draft);
      setNeedsTranscripts(json.needsTranscripts);
      setProvider(json.provider);
    } catch {
      showToast("Network error. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function copyToClipboard() {
    if (!draft) return;
    const text = method === "email" && draft.subject
      ? `Subject: ${draft.subject}\n\n${draft.message}`
      : draft.message;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      showToast("Copied to clipboard");
    } catch {
      showToast("Couldn't copy. Select and copy manually.");
    }
  }

  async function logAsSent() {
    if (!draft || logging || logged) return;
    setLogging(true);
    const text = method === "email" && draft.subject
      ? `Subject: ${draft.subject}\n\n${draft.message}`
      : draft.message;
    try {
      const res = await fetch("/api/outreach/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          creatorId: creator.id,
          method,
          messageText: text,
          bumpTarget: true,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(`Couldn't log: ${err.error ?? res.status}`);
        return;
      }
      setLogged(true);
      showToast("Logged as sent — target marked as pitched.");
    } catch {
      showToast("Network error. Try again.");
    } finally {
      setLogging(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-text/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[680px] max-h-[90vh] overflow-y-auto rounded-[16px] bg-surface border border-border shadow-[0_24px_48px_rgba(11,31,58,0.20)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-md text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 sm:p-6">
          <div className="text-[10.5px] uppercase font-semibold text-muted tracking-wider">
            Generate outreach
          </div>
          <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-text mt-1">
            Pitch {creator.display_name ?? creator.handle}
          </h2>
          <div className="text-[12.5px] text-muted mt-0.5">
            {creator.handle} · {creator.niche}
          </div>

          <div className="mt-5">
            <div className="text-[12px] text-muted mb-1.5">Channel</div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(METHOD_LABELS) as OutreachMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "px-2.5 py-1 rounded-full border text-[12px] cursor-pointer transition-colors",
                    method === m
                      ? "border-accent/40 bg-accent-soft text-accent font-medium"
                      : "border-border bg-surface text-muted hover:border-accent/30 hover:text-text",
                  )}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {!draft && (
            <Button
              className="mt-5 w-full"
              onClick={generate}
              disabled={generating}
            >
              <Wand2 className="w-3.5 h-3.5" />
              {generating ? "Generating…" : "Generate draft"}
            </Button>
          )}

          {draft && (
            <div className="mt-5 space-y-3">
              {needsTranscripts && (
                <div className="rounded-[10px] border border-border bg-surface-2 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                  <div className="text-[12.5px] text-muted leading-relaxed">
                    No transcripts found for {creator.handle}. For a sharper opener,
                    transcribe 2–3 of their recent videos in{" "}
                    <span className="text-text font-medium">Transcribe & Analyze</span>{" "}
                    first, then regenerate.
                  </div>
                </div>
              )}

              {method === "email" && draft.subject && (
                <div className="rounded-[10px] border border-border bg-surface-2 p-3">
                  <div className="text-[10.5px] uppercase font-semibold text-muted mb-1" style={{ letterSpacing: "0.06em" }}>
                    Subject
                  </div>
                  <div className="text-[13.5px] font-medium text-text">
                    {draft.subject}
                  </div>
                </div>
              )}

              <div className="rounded-[10px] border border-border bg-surface-2 p-3">
                <div className="text-[10.5px] uppercase font-semibold text-muted mb-1.5" style={{ letterSpacing: "0.06em" }}>
                  Message
                </div>
                <div className="text-[13.5px] text-text leading-relaxed whitespace-pre-wrap">
                  {draft.message}
                </div>
              </div>

              <div className="rounded-[10px] border border-accent/20 bg-accent-soft/40 p-3">
                <div className="text-[10.5px] uppercase font-semibold text-accent mb-1" style={{ letterSpacing: "0.06em" }}>
                  Why this should land
                </div>
                <div className="text-[12.5px] text-text/90 leading-snug">
                  {draft.rationale}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <div className="text-[11px] text-muted">
                  {provider === "stub" ? "Demo draft" : "Generated by Claude"}
                  {draft.references.length > 0 && (
                    <> · {draft.references.length} reference{draft.references.length === 1 ? "" : "s"}</>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" onClick={generate} disabled={generating}>
                    {generating ? "Regenerating…" : "Regenerate"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={logAsSent}
                    disabled={logging || logged}
                    title="Record this as sent and mark the target as pitched"
                  >
                    {logged ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Logged
                      </>
                    ) : logging ? (
                      "Logging…"
                    ) : (
                      "Log as sent"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Reserved for the planned creator detail page (Workstream H ships AI outreach). */
void ArrowRight;
