"use client";

import { useState } from "react";
import {
  User,
  Briefcase,
  Building2,
  Palette,
  Dumbbell,
  Home,
  Layers,
  HelpCircle,
  Sparkles,
  Camera,
  PlaySquare,
  Hash,
  Music,
  ShoppingBag,
  Wand2,
  Image as ImageIcon,
  FileBarChart,
  Users,
  Plug,
  ArrowRight,
  Check,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { HelpText } from "./primitives/HelpText";
import { PickCard } from "./primitives/PickCard";
import { ChipGroup } from "./primitives/ChipGroup";
import { Segmented } from "./primitives/Segmented";
import {
  creatorTypes,
  niches,
  goals,
  platforms,
  contentFormats,
  frequencies,
  planningWorkflows,
  problems,
  sellingTypes,
  ctaStyles,
  brandTones,
  sequenceUses,
  assetTypes,
  reportsNeeds,
  teamSetups,
  labelOf,
} from "@/lib/onboarding/options";
import type {
  ProfileDraft,
  CreatorType,
  Goal,
  Platform,
  ContentFormat,
  Frequency,
  PlanningWorkflow,
  Problem,
  Selling,
  Cta,
  BrandTone,
  SequenceUse,
  AssetType,
  ReportsNeed,
  TeamSetup,
  StartMode,
} from "@/lib/onboarding/types";

type StepProps = {
  draft: ProfileDraft;
  update: (patch: Partial<ProfileDraft>) => void;
  goToStep?: (n: number) => void;
};

const CREATOR_ICONS: Record<CreatorType, React.ReactNode> = {
  creator: <User className="w-4 h-4" />,
  infoproduct: <Briefcase className="w-4 h-4" />,
  agency: <Building2 className="w-4 h-4" />,
  tattoo: <Palette className="w-4 h-4" />,
  fitness: <Dumbbell className="w-4 h-4" />,
  realestate: <Home className="w-4 h-4" />,
  brand: <Layers className="w-4 h-4" />,
  other: <HelpCircle className="w-4 h-4" />,
};

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  instagram: <Camera className="w-4 h-4" />,
  tiktok: <Music className="w-4 h-4" />,
  youtube: <PlaySquare className="w-4 h-4" />,
  linkedin: <Briefcase className="w-4 h-4" />,
  x: <Hash className="w-4 h-4" />,
  facebook: <Hash className="w-4 h-4" />,
};

/* ─── 0. Welcome ─────────────────────────────────────────────────── */

export function StepWelcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center pt-10">
      <div
        className="w-16 h-16 rounded-2xl mx-auto grid place-items-center text-white mb-6"
        style={{
          background: "linear-gradient(135deg, #14315E, #0B1F3A)",
          boxShadow: "0 8px 24px -8px rgba(11,31,58,0.45)",
        }}
      >
        <Sparkles className="w-7 h-7" />
      </div>
      <h1 className="text-[36px] font-semibold tracking-[-0.02em] text-text leading-tight">
        Your creator OS,
        <br />
        built around you.
      </h1>
      <p className="text-[15px] text-muted mt-4 max-w-[520px] mx-auto leading-relaxed">
        Plan, create, analyze, and grow — from one premium command center.
        Answer a few quick questions and we&rsquo;ll set up a workspace that
        fits the way you work.
      </p>
      <div className="mt-8 inline-flex items-center gap-3">
        <Button size="md" onClick={onStart}>
          <Sparkles className="w-3.5 h-3.5" /> Set up my workspace
        </Button>
      </div>
      <p className="text-[11.5px] text-muted mt-4">
        Takes about 3 minutes · You can change anything later.
      </p>
    </div>
  );
}

/* ─── 1. What are you building ───────────────────────────────────── */

export function StepCreatorType({ draft, update }: StepProps) {
  return (
    <>
      <HelpText
        eyebrow="About you"
        title="What are you building?"
        description="Pick the one closest to your work. Drives the personas + sample data we set up."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {creatorTypes.map((c) => (
          <PickCard
            key={c.key}
            active={draft.creatorType === c.key}
            onClick={() => update({ creatorType: c.key })}
            title={c.label}
            description={c.description}
            icon={CREATOR_ICONS[c.key]}
          />
        ))}
      </div>
    </>
  );
}

/* ─── 2. Niche ───────────────────────────────────────────────────── */

export function StepNiche({ draft, update }: StepProps) {
  const isPreset = niches.some((n) => n.key === draft.niche);
  const [custom, setCustom] = useState(
    draft.niche && !isPreset ? draft.niche : ""
  );
  return (
    <>
      <HelpText
        eyebrow="Your space"
        title="What niche are you in?"
        description="Helps us tune sample assets, idea hooks, and report copy."
      />
      <ChipGroup
        value={isPreset ? draft.niche : undefined}
        options={niches}
        onChange={(v) => {
          update({ niche: v });
          setCustom("");
        }}
      />
      <div className="mt-5 max-w-[460px] mx-auto">
        <label className="text-[12.5px] font-semibold text-text block mb-1.5">
          Or type a custom niche
        </label>
        <input
          value={custom}
          onChange={(e) => {
            const v = e.target.value;
            setCustom(v);
            update({ niche: v });
          }}
          placeholder="e.g. youth football coach, vintage interiors…"
          className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
        />
      </div>
    </>
  );
}

/* ─── 3. Main goal ───────────────────────────────────────────────── */

export function StepGoal({ draft, update }: StepProps) {
  const primary = draft.primaryGoal;
  const secondaries = draft.secondaryGoals ?? [];
  function pickPrimary(g: Goal) {
    update({
      primaryGoal: g,
      secondaryGoals: secondaries.filter((x) => x !== g),
    });
  }
  function toggleSecondary(g: Goal) {
    if (g === primary) return;
    if (secondaries.includes(g)) {
      update({ secondaryGoals: secondaries.filter((x) => x !== g) });
    } else if (secondaries.length < 3) {
      update({ secondaryGoals: [...secondaries, g] });
    }
  }
  return (
    <>
      <HelpText
        eyebrow="Direction"
        title="What's your main goal?"
        description="Tap one as primary. Optionally add up to 3 secondary goals."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {goals.map((g) => {
          const isPrimary = primary === g.key;
          const isSecondary = secondaries.includes(g.key);
          return (
            <div key={g.key} className="relative">
              <PickCard
                active={isPrimary || isSecondary}
                onClick={() =>
                  isPrimary
                    ? toggleSecondary(g.key)
                    : pickPrimary(g.key)
                }
                title={g.label}
                description={g.description}
                badge={
                  isPrimary ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-white bg-accent px-1.5 py-0.5 rounded">
                      <Star className="w-2.5 h-2.5" fill="currentColor" /> Primary
                    </span>
                  ) : isSecondary ? (
                    <span className="text-[10px] font-semibold uppercase text-accent bg-accent-soft border border-accent-border px-1.5 py-0.5 rounded">
                      Secondary
                    </span>
                  ) : null
                }
              />
              {!isPrimary && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSecondary(g.key);
                  }}
                  className={cn(
                    "absolute bottom-2.5 right-2.5 text-[10.5px] font-medium px-2 py-0.5 rounded-md cursor-pointer transition-colors",
                    isSecondary
                      ? "bg-accent text-white hover:bg-accent-2"
                      : "bg-surface-2 text-muted hover:text-text border border-border"
                  )}
                >
                  {isSecondary ? "Remove" : "+ also"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── 4. Platforms ───────────────────────────────────────────────── */

export function StepPlatforms({ draft, update }: StepProps) {
  const value = draft.platforms ?? [];
  function toggle(p: Platform) {
    update({
      platforms: value.includes(p)
        ? value.filter((x) => x !== p)
        : [...value, p],
    });
  }
  return (
    <>
      <HelpText
        eyebrow="Where you publish"
        title="What platforms do you use?"
        description="Instagram is our primary integration today — others personalize copy + reports."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {platforms.map((p) => (
          <div key={p.key} className="relative">
            <PickCard
              active={value.includes(p.key)}
              onClick={() => toggle(p.key)}
              title={p.label}
              description={p.description}
              icon={PLATFORM_ICONS[p.key]}
              multi
            />
            {p.key === "instagram" && (
              <span className="absolute top-2.5 left-2.5 text-[9.5px] font-semibold uppercase text-accent bg-accent-soft border border-accent-border px-1.5 py-0.5 rounded">
                Primary
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── 5. Content shape (formats + frequency) ─────────────────────── */

export function StepContentShape({ draft, update }: StepProps) {
  const formats = draft.contentFormats ?? [];
  return (
    <>
      <HelpText
        eyebrow="Your output"
        title="What do you create most?"
        description="Pick everything that applies. We'll personalize sample assets + Sequence Studio defaults."
      />
      <div className="mb-7">
        <ChipGroup<ContentFormat>
          multi
          value={formats}
          options={contentFormats}
          onChange={(v) => update({ contentFormats: v })}
        />
      </div>
      <div>
        <div className="text-[12.5px] font-semibold text-text mb-2 text-center">
          How often do you post?
        </div>
        <Segmented<Frequency>
          value={draft.frequency}
          options={frequencies}
          onChange={(v) => update({ frequency: v })}
        />
      </div>
    </>
  );
}

/* ─── 6. How you work today (workflow + biggest problem) ─────────── */

export function StepWorkflowProblem({ draft, update }: StepProps) {
  const wf = draft.planningWorkflow ?? [];
  return (
    <>
      <HelpText
        eyebrow="How you work today"
        title="What's holding you back?"
        description="Pick how you currently plan — and the biggest content problem you'd like CreatorHub to solve."
      />
      <div className="mb-7">
        <div className="text-[12.5px] font-semibold text-text mb-2">
          Current planning workflow
        </div>
        <ChipGroup<PlanningWorkflow>
          multi
          value={wf}
          options={planningWorkflows}
          onChange={(v) => update({ planningWorkflow: v })}
        />
      </div>
      <div>
        <div className="text-[12.5px] font-semibold text-text mb-2">
          Biggest content problem
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {problems.map((p) => (
            <PickCard
              key={p.key}
              size="sm"
              active={draft.biggestProblem === p.key}
              onClick={() => update({ biggestProblem: p.key as Problem })}
              title={p.label}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── 7. Audience ────────────────────────────────────────────────── */

export function StepAudience({ draft, update }: StepProps) {
  const a = draft.audience ?? { who: "", wants: "", problem: "" };
  const set = (k: "who" | "wants" | "problem", v: string) =>
    update({ audience: { ...a, [k]: v } });
  return (
    <>
      <HelpText
        eyebrow="Halfway there"
        title="Who's your audience?"
        description="A few short notes. Drives the brand context the AI uses for every sequence."
      />
      <div className="space-y-4 max-w-[560px] mx-auto">
        <Field
          label="Who are you trying to reach?"
          value={a.who}
          placeholder="e.g. solo coaches doing $5–20K/mo"
          onChange={(v) => set("who", v)}
        />
        <Field
          label="What do they want?"
          value={a.wants}
          placeholder="e.g. predictable inbound DMs"
          onChange={(v) => set("wants", v)}
        />
        <Field
          label="What problem do you solve for them?"
          value={a.problem}
          placeholder="e.g. content with a system, not just posts"
          onChange={(v) => set("problem", v)}
        />
        <p className="text-[11.5px] text-muted text-center">
          All optional &mdash; leave blank if you&rsquo;d rather skip.
        </p>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[12.5px] font-semibold text-text block mb-1.5">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}

/* ─── 8. Selling ─────────────────────────────────────────────────── */

export function StepSelling({ draft, update }: StepProps) {
  const value = draft.selling ?? [];
  return (
    <>
      <HelpText
        eyebrow="What you sell"
        title="What do you sell or promote?"
        description="Pick anything that applies. Skip if you're not selling yet."
      />
      <div className="mb-6">
        <ChipGroup<Selling>
          multi
          value={value}
          options={sellingTypes}
          onChange={(v) => update({ selling: v })}
        />
      </div>
      <div className="max-w-[460px] mx-auto">
        <label className="text-[12.5px] font-semibold text-text block mb-1.5">
          Offer / product / service name (optional)
        </label>
        <input
          value={draft.offerName ?? ""}
          onChange={(e) => update({ offerName: e.target.value })}
          placeholder="e.g. The DM Engine, Studio booking, Strength cohort…"
          className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
        />
      </div>
    </>
  );
}

/* ─── 9. CTA + brand voice ───────────────────────────────────────── */

export function StepCtaTone({ draft, update }: StepProps) {
  const tones = draft.brandTones ?? [];
  const isCustomCta = draft.ctaStyle === "custom";
  return (
    <>
      <HelpText
        eyebrow="Voice"
        title="Preferred CTA + brand tone"
        description="Pick how you usually call viewers to action — and the tones your copy should use."
      />
      <div className="mb-7">
        <div className="text-[12.5px] font-semibold text-text mb-2">CTA style</div>
        <ChipGroup<Cta>
          value={draft.ctaStyle}
          options={ctaStyles}
          onChange={(v) => update({ ctaStyle: v })}
        />
        {isCustomCta && (
          <input
            value={draft.customCta ?? ""}
            onChange={(e) => update({ customCta: e.target.value })}
            placeholder="e.g. Visit our showroom this weekend"
            className="w-full h-10 px-3 mt-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
          />
        )}
      </div>
      <div>
        <div className="text-[12.5px] font-semibold text-text mb-2">
          Brand tones (multi-select)
        </div>
        <ChipGroup<BrandTone>
          multi
          value={tones}
          options={brandTones}
          onChange={(v) => update({ brandTones: v })}
        />
      </div>
    </>
  );
}

/* ─── 10. Sequence Studio + Library ──────────────────────────────── */

export function StepStudioLibrary({ draft, update }: StepProps) {
  const seq = draft.sequenceUses ?? [];
  const ats = draft.assetTypes ?? [];
  return (
    <>
      <HelpText
        eyebrow="Almost done"
        title="How will you use Studio + Library?"
        description="Sequence Studio works best with photos and short videos up to 15 seconds."
      />
      <div className="mb-7">
        <div className="text-[12.5px] font-semibold text-text mb-2">
          What should Sequence Studio help with?
        </div>
        <ChipGroup<SequenceUse>
          multi
          value={seq}
          options={sequenceUses}
          onChange={(v) => update({ sequenceUses: v })}
        />
      </div>
      <div className="mb-7">
        <div className="text-[12.5px] font-semibold text-text mb-2">
          What kinds of assets do you have?
        </div>
        <ChipGroup<AssetType>
          multi
          value={ats}
          options={assetTypes}
          onChange={(v) => update({ assetTypes: v })}
        />
      </div>
      <ToggleRow
        title="Use niche-specific presets"
        description="Pre-fill Studio with copy variants tuned to your niche."
        checked={draft.wantsNichePresets ?? true}
        onChange={(v) => update({ wantsNichePresets: v })}
      />
    </>
  );
}

/* ─── 11. Reports + team ─────────────────────────────────────────── */

export function StepReportsTeam({ draft, update }: StepProps) {
  const rn = draft.reportsNeeds ?? [];
  return (
    <>
      <HelpText
        eyebrow="How you work"
        title="Reports + team setup"
        description="Tells us where to put effort in Reports and Pipeline."
      />
      <div className="mb-7">
        <div className="text-[12.5px] font-semibold text-text mb-2">
          What reports do you need?
        </div>
        <ChipGroup<ReportsNeed>
          multi
          value={rn}
          options={reportsNeeds}
          onChange={(v) => update({ reportsNeeds: v })}
        />
      </div>
      <div>
        <div className="text-[12.5px] font-semibold text-text mb-2">
          Team setup
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {teamSetups.map((t) => (
            <PickCard
              key={t.key}
              size="sm"
              active={draft.team === t.key}
              onClick={() => update({ team: t.key as TeamSetup })}
              title={t.label}
              description={t.description}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── 12. Connect or demo ────────────────────────────────────────── */

export function StepConnect({ draft, update }: StepProps) {
  return (
    <>
      <HelpText
        eyebrow="Final step"
        title="Connect Instagram or use sample data?"
        description="Connect to import real posts and performance — or explore the workspace with sample data first."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[680px] mx-auto">
        <PickCard
          size="lg"
          active={draft.startMode === "instagram"}
          onClick={() => update({ startMode: "instagram" as StartMode })}
          title="Connect Instagram"
          description="Import posts, understand performance, and turn data into better content decisions."
          icon={<Plug className="w-4 h-4" />}
        />
        <PickCard
          size="lg"
          active={draft.startMode === "demo"}
          onClick={() => update({ startMode: "demo" as StartMode })}
          title="Use sample workspace"
          description="Explore everything CreatorHub does with realistic mock data. Connect later from Integrations."
          icon={<Sparkles className="w-4 h-4" />}
        />
      </div>
    </>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-surface card-base p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-text">{title}</div>
        <div className="text-[11.5px] text-muted mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0",
          checked ? "bg-accent" : "bg-surface-3"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-4"
          )}
        />
      </button>
    </div>
  );
}

/* ─── 13. Summary ────────────────────────────────────────────────── */

export function StepSummary({ draft, goToStep }: StepProps) {
  const sectionGo = (n: number) => () => goToStep?.(n);
  return (
    <>
      <HelpText
        eyebrow="Let's review"
        title="Your workspace, at a glance"
        description="Looks good? Click any section to revisit. Otherwise, build your workspace."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SummaryCard label="Creator type" value={labelOf(creatorTypes, draft.creatorType)} onEdit={sectionGo(1)} />
        <SummaryCard label="Niche" value={draft.niche ? (niches.find((n) => n.key === draft.niche)?.label ?? draft.niche) : "—"} onEdit={sectionGo(2)} />
        <SummaryCard
          label="Primary goal"
          value={labelOf(goals, draft.primaryGoal)}
          extra={(draft.secondaryGoals ?? []).map((g) => labelOf(goals, g)).join(" · ")}
          onEdit={sectionGo(3)}
        />
        <SummaryCard
          label="Platforms"
          value={(draft.platforms ?? []).map((p) => labelOf(platforms, p)).join(" · ") || "—"}
          onEdit={sectionGo(4)}
        />
        <SummaryCard
          label="Content + cadence"
          value={(draft.contentFormats ?? []).map((c) => labelOf(contentFormats, c)).join(" · ") || "—"}
          extra={labelOf(frequencies, draft.frequency)}
          onEdit={sectionGo(5)}
        />
        <SummaryCard
          label="Workflow + problem"
          value={(draft.planningWorkflow ?? []).map((w) => labelOf(planningWorkflows, w)).join(" · ") || "—"}
          extra={labelOf(problems, draft.biggestProblem)}
          onEdit={sectionGo(6)}
        />
        <SummaryCard
          label="Audience"
          value={draft.audience?.who?.trim() || "—"}
          extra={draft.audience?.wants?.trim() || ""}
          onEdit={sectionGo(7)}
        />
        <SummaryCard
          label="Selling"
          value={(draft.selling ?? []).map((s) => labelOf(sellingTypes, s)).join(" · ") || "—"}
          extra={draft.offerName?.trim() || ""}
          onEdit={sectionGo(8)}
        />
        <SummaryCard
          label="CTA + tone"
          value={labelOf(ctaStyles, draft.ctaStyle)}
          extra={(draft.brandTones ?? []).map((t) => labelOf(brandTones, t)).join(" · ")}
          onEdit={sectionGo(9)}
        />
        <SummaryCard
          label="Studio + Library"
          value={`${(draft.sequenceUses ?? []).length} Studio uses · ${(draft.assetTypes ?? []).length} asset types`}
          extra={draft.wantsNichePresets ? "Niche presets ON" : "Niche presets OFF"}
          onEdit={sectionGo(10)}
        />
        <SummaryCard
          label="Reports + team"
          value={(draft.reportsNeeds ?? []).map((r) => labelOf(reportsNeeds, r)).join(" · ") || "—"}
          extra={labelOf(teamSetups, draft.team)}
          onEdit={sectionGo(11)}
        />
        <SummaryCard
          label="Start mode"
          value={draft.startMode === "instagram" ? "Connect Instagram" : draft.startMode === "demo" ? "Use sample workspace" : "—"}
          onEdit={sectionGo(12)}
        />
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  extra,
  onEdit,
}: {
  label: string;
  value: string;
  extra?: string;
  onEdit: () => void;
}) {
  return (
    <Card padded={false} className="p-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div
          className="text-[10.5px] uppercase font-semibold text-muted mb-1"
          style={{ letterSpacing: "0.06em" }}
        >
          {label}
        </div>
        <div className="text-[13.5px] text-text font-medium leading-snug">
          {value || "—"}
        </div>
        {extra && (
          <div className="text-[11.5px] text-muted mt-1 leading-snug">
            {extra}
          </div>
        )}
      </div>
      <button
        onClick={onEdit}
        className="text-[11.5px] text-accent hover:text-accent-2 font-medium cursor-pointer shrink-0"
      >
        Edit
      </button>
    </Card>
  );
}

/* ─── 14. Workspace ready ────────────────────────────────────────── */

export function StepReady({
  displayName,
  primaryGoalLabel,
  quickActions,
  onPick,
}: {
  displayName: string;
  primaryGoalLabel: string;
  quickActions: { label: string; href: string; hint: string }[];
  onPick: (href: string) => void;
}) {
  return (
    <div className="text-center pt-6">
      <div
        className="w-16 h-16 rounded-full mx-auto grid place-items-center text-white mb-5 relative"
        style={{
          background: "linear-gradient(135deg, #14315E, #0B1F3A)",
          boxShadow: "0 0 0 8px rgba(37,99,235,0.10), 0 0 0 16px rgba(37,99,235,0.05)",
        }}
      >
        <Check className="w-7 h-7" strokeWidth={3} />
      </div>
      <div
        className="text-[11px] uppercase font-semibold text-accent mb-2"
        style={{ letterSpacing: "0.10em" }}
      >
        Setup complete · 100%
      </div>
      <h1 className="text-[32px] font-semibold tracking-[-0.015em] text-text leading-tight">
        Welcome to CreatorHub,
        <br />
        {displayName.split(/\s+/)[0]}.
      </h1>
      <p className="text-[14px] text-muted mt-3 max-w-[480px] mx-auto leading-relaxed">
        Your workspace is built around{" "}
        <span className="text-accent font-medium">{primaryGoalLabel}</span>.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-[680px] mx-auto">
        {quickActions.map((a, i) => (
          <button
            key={a.href}
            onClick={() => onPick(a.href)}
            className={cn(
              "lift text-left rounded-[14px] border bg-surface card-base p-4 cursor-pointer transition-colors",
              i === 0
                ? "border-accent/45 bg-accent-soft"
                : "border-border hover:border-accent/25"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[13.5px] font-semibold text-text">
                {a.label}
              </span>
              <ArrowRight
                className={cn(
                  "w-3.5 h-3.5 shrink-0",
                  i === 0 ? "text-accent" : "text-muted"
                )}
              />
            </div>
            <div className="text-[11.5px] text-muted leading-snug">{a.hint}</div>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <button
          onClick={() => onPick("/dashboard")}
          className="text-[12.5px] text-muted hover:text-text underline-offset-2 hover:underline cursor-pointer"
        >
          I&rsquo;ll explore freely → Open Dashboard
        </button>
      </div>
    </div>
  );
}

/* Re-export icon set for callers that need it */
export {
  Wand2,
  ImageIcon,
  FileBarChart,
  Users,
  ShoppingBag,
};
