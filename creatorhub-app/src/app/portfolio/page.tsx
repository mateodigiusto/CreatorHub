"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Eye,
  ExternalLink,
  Plus,
  Trash2,
  Save,
  X,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/cn";
import type { Platform } from "@/lib/onboarding/types";

type Portfolio = {
  id: string;
  slug: string;
  bio: string | null;
  specialties: string[];
  platforms: Platform[];
  years_experience: number | null;
  contact_email: string | null;
  contact_links: Record<string, string>;
  work_samples: Array<{
    video_url: string;
    description: string;
    results: string;
    thumbnail_url?: string;
  }>;
  niche_tags: string[];
  client_logos: Array<{ name: string; logo_url?: string }>;
  testimonials: Array<{
    quote: string;
    attribution: string;
    link?: string;
    avatar_url?: string;
  }>;
  is_public: boolean;
  published_at: string | null;
};

const PLATFORM_OPTIONS: Platform[] = [
  "instagram", "tiktok", "youtube", "linkedin", "x", "facebook",
];

export default function PortfolioEditorPage() {
  const router = useRouter();
  const { showToast } = useAppState();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [draft, setDraft] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio", { credentials: "include" });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json = (await res.json()) as { portfolio: Portfolio };
      setPortfolio(json.portfolio);
      setDraft(json.portfolio);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(
    () => !!draft && !!portfolio && JSON.stringify(draft) !== JSON.stringify(portfolio),
    [draft, portfolio],
  );

  if (loading || !draft) {
    return (
      <>
        <PageHeader title="Portfolio" description="Loading…" />
        <div className="h-72 rounded-[14px] bg-surface-2 border border-border animate-pulse" />
      </>
    );
  }

  async function save() {
    if (!dirty || saving || !draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(toApiPatch(draft)),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(`Couldn't save: ${err.error ?? res.status}`);
        return;
      }
      const json = (await res.json()) as { portfolio: Portfolio };
      setPortfolio(json.portfolio);
      setDraft(json.portfolio);
      showToast("Portfolio saved");
    } catch {
      showToast("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (publishing || !portfolio) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ publish: !portfolio.is_public }),
      });
      if (!res.ok) {
        showToast("Couldn't publish. Try again.");
        return;
      }
      const json = (await res.json()) as { portfolio: Portfolio };
      setPortfolio(json.portfolio);
      setDraft((prev) =>
        prev ? { ...prev, is_public: json.portfolio.is_public, published_at: json.portfolio.published_at } : prev,
      );
      showToast(json.portfolio.is_public ? "Portfolio published" : "Portfolio unpublished");
    } catch {
      showToast("Network error. Try again.");
    } finally {
      setPublishing(false);
    }
  }

  const publicUrl = `/portfolio/${draft.slug}`;

  return (
    <>
      <PageHeader
        title="Your portfolio"
        description={
          draft.is_public
            ? "Live at the URL below. Updates ship instantly when you save."
            : "Edit then publish. The public URL goes live the moment you flip the switch."
        }
        actions={
          <div className="flex items-center gap-2">
            {dirty && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setDraft(portfolio)} disabled={saving}>
                  <X className="w-3.5 h-3.5" /> Cancel
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save changes"}
                </Button>
              </>
            )}
            {!dirty && (
              <>
                {draft.is_public && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(`/api/portfolio/${draft.slug}/export-pdf`, "_blank")
                      }
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push(publicUrl)}>
                      <Eye className="w-3.5 h-3.5" /> View live
                    </Button>
                  </>
                )}
                <Button size="sm" onClick={togglePublish} disabled={publishing}>
                  <Globe className="w-3.5 h-3.5" />
                  {publishing
                    ? "Working…"
                    : draft.is_public
                      ? "Unpublish"
                      : "Publish portfolio"}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Status strip */}
      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone={draft.is_public ? "green" : "neutral"}>
              {draft.is_public ? "Live" : "Draft"}
            </Badge>
            <code className="text-[12.5px] bg-surface-2 px-2 py-1 rounded text-muted">
              creatorhub.io{publicUrl}
            </code>
            {draft.is_public && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-accent hover:text-accent-2 inline-flex items-center gap-1"
              >
                Open <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <SlugField
            value={draft.slug}
            onChange={(v) => setDraft({ ...draft, slug: v })}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* About */}
          <Card>
            <CardHeader title="About" description="The intro at the top of your portfolio." />
            <div className="space-y-4">
              <Field
                label="Bio"
                value={draft.bio ?? ""}
                onChange={(v) => setDraft({ ...draft, bio: v || null })}
                multiline
                rows={4}
                placeholder="Senior video editor. 200+ videos shipped for fitness + business creators. Specialty in 60-90s short-form…"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField
                  label="Years of experience"
                  value={draft.years_experience}
                  onChange={(n) => setDraft({ ...draft, years_experience: n })}
                  min={0}
                  max={80}
                />
                <Field
                  label="Contact email"
                  value={draft.contact_email ?? ""}
                  onChange={(v) => setDraft({ ...draft, contact_email: v || null })}
                  placeholder="hire@you.com"
                />
              </div>
            </div>
          </Card>

          {/* Specialties + platforms + niche tags */}
          <Card>
            <CardHeader title="Skills & focus" />
            <div className="space-y-4">
              <ChipListField
                label="Specialties"
                hint="What you're best at. 3–6 short phrases."
                value={draft.specialties}
                onChange={(v) => setDraft({ ...draft, specialties: v })}
                placeholder="Add a specialty (Reels editing, retention pacing…)"
              />
              <ChipListField
                label="Niche tags"
                hint="The verticals you've worked in. Helps creators find you."
                value={draft.niche_tags}
                onChange={(v) => setDraft({ ...draft, niche_tags: v })}
                placeholder="Add a niche (fitness, real-estate, info-product…)"
              />
              <div>
                <div className="text-[12px] text-muted mb-1.5">Platforms you edit for</div>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_OPTIONS.map((p) => {
                    const active = draft.platforms.includes(p);
                    return (
                      <button
                        key={p}
                        onClick={() => {
                          const next = active
                            ? draft.platforms.filter((x) => x !== p)
                            : [...draft.platforms, p];
                          setDraft({ ...draft, platforms: next });
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-full border text-[12px] capitalize transition-colors cursor-pointer",
                          active
                            ? "border-accent/40 bg-accent-soft text-accent"
                            : "border-border bg-surface text-muted hover:border-accent/30 hover:text-text",
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Work samples */}
          <Card>
            <CardHeader
              title="Work samples"
              description="Public links to videos you edited. Show the result, not the process."
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      work_samples: [
                        ...draft.work_samples,
                        { video_url: "", description: "", results: "" },
                      ],
                    })
                  }
                >
                  <Plus className="w-3.5 h-3.5" /> Add sample
                </Button>
              }
            />
            {draft.work_samples.length === 0 ? (
              <div className="text-[12.5px] text-muted italic">
                No samples yet. Add a YouTube / IG / TikTok link with a 1-line description.
              </div>
            ) : (
              <div className="space-y-3">
                {draft.work_samples.map((s, idx) => (
                  <div key={idx} className="border border-border rounded-[10px] p-3.5 bg-surface-2 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Field
                        label="Video URL"
                        value={s.video_url}
                        onChange={(v) =>
                          updateSample(draft, setDraft, idx, { video_url: v })
                        }
                        placeholder="https://youtube.com/watch?v=…"
                      />
                      <button
                        onClick={() => removeSample(draft, setDraft, idx)}
                        className="text-muted hover:text-red-600 mt-5 cursor-pointer"
                        aria-label="Remove sample"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Field
                      label="Description"
                      value={s.description}
                      onChange={(v) =>
                        updateSample(draft, setDraft, idx, { description: v })
                      }
                      placeholder="60s educational reel — pacing + retention edits"
                    />
                    <Field
                      label="Results"
                      value={s.results}
                      onChange={(v) =>
                        updateSample(draft, setDraft, idx, { results: v })
                      }
                      placeholder="2.4M views · 12k saves · creator's most-shared video"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Testimonials */}
          <Card>
            <CardHeader
              title="Testimonials"
              description="Quotes from creators you've worked with."
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      testimonials: [
                        ...draft.testimonials,
                        { quote: "", attribution: "" },
                      ],
                    })
                  }
                >
                  <Plus className="w-3.5 h-3.5" /> Add testimonial
                </Button>
              }
            />
            {draft.testimonials.length === 0 ? (
              <div className="text-[12.5px] text-muted italic">
                No testimonials yet.
              </div>
            ) : (
              <div className="space-y-3">
                {draft.testimonials.map((t, idx) => (
                  <div key={idx} className="border border-border rounded-[10px] p-3.5 bg-surface-2 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Field
                        label="Quote"
                        value={t.quote}
                        onChange={(v) =>
                          updateTestimonial(draft, setDraft, idx, { quote: v })
                        }
                        multiline
                        rows={2}
                        placeholder="Best editor I've worked with — turnaround under 24h…"
                      />
                      <button
                        onClick={() => removeTestimonial(draft, setDraft, idx)}
                        className="text-muted hover:text-red-600 mt-5 cursor-pointer"
                        aria-label="Remove testimonial"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Field
                      label="Attribution"
                      value={t.attribution}
                      onChange={(v) =>
                        updateTestimonial(draft, setDraft, idx, { attribution: v })
                      }
                      placeholder="@hubermanlab · 6.2M followers"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Publishing"
              description="Public visibility + the URL editors ping you with."
            />
            <div className="text-[12.5px] text-muted leading-relaxed space-y-2">
              <p>
                When you publish, your portfolio is reachable at the URL above
                without sign-in. Anyone with the link can see it.
              </p>
              <p>
                Unpublishing flips it back to private — links stop resolving but
                your content stays saved.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ─── Field components ───────────────────────────────────────────── */

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div className="flex-1">
      <div className="text-[12px] text-muted mb-1">{label}</div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full text-[13.5px] text-text bg-surface border border-border rounded-[10px] px-3 py-2 focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 leading-relaxed resize-y"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
        />
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <div className="text-[12px] text-muted mb-1">{label}</div>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const n = e.target.value === "" ? null : Number(e.target.value);
          onChange(n === null || Number.isNaN(n) ? null : n);
        }}
        min={min}
        max={max}
        className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}

function ChipListField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const t = draft.trim();
    if (!t || value.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  }

  return (
    <div>
      <div className="text-[12px] text-muted mb-1">{label}</div>
      <div className="text-[11px] text-muted mb-2">{hint}</div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-accent/25 bg-accent-soft text-[12px] text-accent"
          >
            {v}
            <button
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="text-accent/70 hover:text-accent cursor-pointer"
              aria-label="Remove"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 h-9 px-3 rounded-[10px] bg-surface border border-border text-[13px] text-text focus:outline-none focus:border-accent/40"
        />
        <Button variant="outline" size="sm" onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

function SlugField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-muted">URL slug:</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        className="h-7 px-2.5 rounded-md bg-surface border border-border text-[12.5px] text-text focus:outline-none focus:border-accent/40 w-[140px]"
        placeholder="your-name"
      />
    </div>
  );
}

/* ─── update helpers (keep main render readable) ────────────────── */

function updateSample(
  draft: Portfolio,
  setDraft: (p: Portfolio) => void,
  idx: number,
  fields: Partial<Portfolio["work_samples"][number]>,
) {
  const next = draft.work_samples.slice();
  next[idx] = { ...next[idx], ...fields };
  setDraft({ ...draft, work_samples: next });
}
function removeSample(
  draft: Portfolio,
  setDraft: (p: Portfolio) => void,
  idx: number,
) {
  setDraft({
    ...draft,
    work_samples: draft.work_samples.filter((_, i) => i !== idx),
  });
}
function updateTestimonial(
  draft: Portfolio,
  setDraft: (p: Portfolio) => void,
  idx: number,
  fields: Partial<Portfolio["testimonials"][number]>,
) {
  const next = draft.testimonials.slice();
  next[idx] = { ...next[idx], ...fields };
  setDraft({ ...draft, testimonials: next });
}
function removeTestimonial(
  draft: Portfolio,
  setDraft: (p: Portfolio) => void,
  idx: number,
) {
  setDraft({
    ...draft,
    testimonials: draft.testimonials.filter((_, i) => i !== idx),
  });
}

/** Convert the loaded snake_case shape to the camelCase API patch. */
function toApiPatch(d: Portfolio): Record<string, unknown> {
  return {
    slug: d.slug,
    bio: d.bio,
    specialties: d.specialties,
    platforms: d.platforms,
    yearsExperience: d.years_experience,
    contactEmail: d.contact_email,
    contactLinks: d.contact_links,
    workSamples: d.work_samples,
    nicheTags: d.niche_tags,
    clientLogos: d.client_logos,
    testimonials: d.testimonials,
  };
}
