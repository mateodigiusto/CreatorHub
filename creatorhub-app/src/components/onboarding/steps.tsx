"use client";

import { useState } from "react";
import {
  User,
  Briefcase,
  Building2,
  Dumbbell,
  Home,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { HelpText } from "./primitives/HelpText";
import { PickCard } from "./primitives/PickCard";
import { ChipGroup } from "./primitives/ChipGroup";
import { Segmented } from "./primitives/Segmented";
import { PlanCard } from "./primitives/PlanCard";
import {
  creatorTypes,
  niches,
  contentFormats,
  problems,
  brandTones,
} from "@/lib/onboarding/options";
import type {
  ProfileDraft,
  CreatorType,
  ContentFormat,
  Problem,
  BrandTone,
  TrialPlan,
  TrialCycle,
} from "@/lib/onboarding/types";

type StepProps = {
  draft: ProfileDraft;
  update: (patch: Partial<ProfileDraft>) => void;
};

const CREATOR_ICONS: Record<CreatorType, React.ReactNode> = {
  creator: <User className="w-4 h-4" />,
  agency: <Building2 className="w-4 h-4" />,
  infoproduct: <Briefcase className="w-4 h-4" />,
  realestate: <Home className="w-4 h-4" />,
  fitness: <Dumbbell className="w-4 h-4" />,
  other: <HelpCircle className="w-4 h-4" />,
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
        About 2 minutes · You can change anything later.
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
        title="What space are you in?"
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
          Or type your own
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

/* ─── 3. Offer (conditional — Agency / Info Product / Real Estate) ─ */

const OFFER_CHIPS: Array<{ label: string; sellingKey: "coaching" | "courses" | "services" | "local" }> = [
  { label: "Coaching", sellingKey: "coaching" },
  { label: "Course", sellingKey: "courses" },
  { label: "Services", sellingKey: "services" },
  { label: "Local service", sellingKey: "local" },
];

export function StepOffer({ draft, update }: StepProps) {
  return (
    <>
      <HelpText
        eyebrow="What you sell"
        title="What's your offer?"
        description="Drives the call-to-action language and sales sequences in Sequence Studio."
      />
      <div className="max-w-[520px] mx-auto">
        <label className="text-[12.5px] font-semibold text-text block mb-1.5">
          What do you sell?
        </label>
        <input
          value={draft.offerName ?? ""}
          onChange={(e) => update({ offerName: e.target.value })}
          placeholder="e.g. The DM Engine, Strength Cohort, $750k+ home tour…"
          className="w-full h-11 px-3.5 rounded-[10px] bg-surface border border-border text-[14px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
        />
        <div className="text-[11.5px] text-muted mt-2">
          Quick start — pick a category to autofill:
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {OFFER_CHIPS.map((c) => {
            const active = draft.selling?.[0] === c.sellingKey;
            return (
              <button
                key={c.sellingKey}
                onClick={() => {
                  update({
                    selling: [c.sellingKey],
                    offerName: draft.offerName?.trim() ? draft.offerName : c.label,
                  });
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-[12.5px] font-medium cursor-pointer transition-colors",
                  active
                    ? "border-accent/45 bg-accent-soft text-text"
                    : "border-border bg-surface text-muted hover:border-accent/25 hover:text-text",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ─── 4. What do you create ──────────────────────────────────────── */

export function StepContentFormats({ draft, update }: StepProps) {
  const formats = draft.contentFormats ?? [];
  return (
    <>
      <HelpText
        eyebrow="Your output"
        title="What do you create?"
        description="Pick everything that applies. Personalizes Sequence Studio defaults + sample assets."
      />
      <ChipGroup<ContentFormat>
        multi
        value={formats}
        options={contentFormats}
        onChange={(v) => update({ contentFormats: v })}
      />
    </>
  );
}

/* ─── 5. Audience (who + problem) ────────────────────────────────── */

export function StepAudience({ draft, update }: StepProps) {
  const a = draft.audience ?? { who: "", wants: "", problem: "" };
  const set = (k: "who" | "problem", v: string) =>
    update({ audience: { ...a, [k]: v } });
  return (
    <>
      <HelpText
        eyebrow="Halfway there"
        title="Who are you reaching?"
        description="Two short notes drive every brand context the AI uses."
      />
      <div className="space-y-4 max-w-[560px] mx-auto">
        <Field
          label="Who are you trying to reach?"
          value={a.who}
          placeholder="e.g. solo coaches doing $5–20K/mo"
          onChange={(v) => set("who", v)}
        />
        <Field
          label="What problem do you solve for them?"
          value={a.problem}
          placeholder="e.g. content with a system, not just posts"
          onChange={(v) => set("problem", v)}
        />
        <p className="text-[11.5px] text-muted text-center">
          Both optional &mdash; leave blank if you&rsquo;d rather skip.
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

/* ─── 6. Brand tone (multi, max 2) ───────────────────────────────── */

export function StepBrandTone({ draft, update }: StepProps) {
  const tones = draft.brandTones ?? [];
  function toggle(t: BrandTone) {
    if (tones.includes(t)) {
      update({ brandTones: tones.filter((x) => x !== t) });
    } else if (tones.length < 2) {
      update({ brandTones: [...tones, t] });
    }
  }
  return (
    <>
      <HelpText
        eyebrow="Voice"
        title="What's your brand tone?"
        description="Pick up to 2. Drives the default tone for every sequence + caption."
      />
      <div className="flex flex-wrap gap-2 justify-center">
        {brandTones.map((t) => {
          const active = tones.includes(t.key);
          return (
            <button
              key={t.key}
              onClick={() => toggle(t.key)}
              className={cn(
                "px-3.5 py-2 rounded-full border text-[13px] font-medium cursor-pointer transition-colors",
                active
                  ? "border-accent/45 bg-accent-soft text-text"
                  : "border-border bg-surface text-text/70 hover:border-accent/25 hover:text-text",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11.5px] text-muted text-center mt-3 tabular-nums">
        {tones.length}/2 selected
      </p>
    </>
  );
}

/* ─── 7. Biggest current problem ─────────────────────────────────── */

export function StepBiggestProblem({ draft, update }: StepProps) {
  return (
    <>
      <HelpText
        eyebrow="What's hardest"
        title="What's your biggest problem right now?"
        description="One pick. Drives your dashboard's 'Next move' callout."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-[700px] mx-auto">
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
    </>
  );
}

/* ─── 8. Pick your plan ──────────────────────────────────────────── */

const PRICING = {
  standard: { monthly: 67, annual: 27, annualTotal: 322 },
  pro:      { monthly: 149, annual: 60, annualTotal: 715 },
} as const;

export function StepPlan({ draft, update }: StepProps) {
  const cycle = (draft.trial?.cycle ?? "annual") as TrialCycle;
  const plan = (draft.trial?.plan ?? (draft.creatorType === "agency" ? "pro" : "standard")) as TrialPlan;

  function setCycle(c: TrialCycle) {
    update({
      trial: {
        plan,
        cycle: c,
        startedAt: draft.trial?.startedAt ?? "",
        expiresAt: draft.trial?.expiresAt ?? "",
      },
    });
  }
  function setPlan(p: TrialPlan) {
    update({
      trial: {
        plan: p,
        cycle,
        startedAt: draft.trial?.startedAt ?? "",
        expiresAt: draft.trial?.expiresAt ?? "",
      },
    });
  }

  const annualBadge = (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase text-accent bg-accent-soft border border-accent-border px-1.5 py-0.5 rounded tracking-wide">
      60% off
    </span>
  );

  return (
    <>
      <HelpText
        eyebrow="Your plan"
        title="Pick your plan."
        description="Start with a 7-day free trial. Cancel anytime."
      />
      <div className="max-w-[280px] mx-auto mb-5">
        <Segmented<TrialCycle>
          value={cycle}
          options={[
            { key: "monthly", label: "Monthly" },
            { key: "annual", label: "Annual · save 60%" },
          ]}
          onChange={setCycle}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[700px] mx-auto">
        <PlanCard
          active={plan === "standard"}
          onClick={() => setPlan("standard")}
          name="Standard"
          tagline="For solo creators."
          priceTop={cycle === "monthly" ? `$${PRICING.standard.monthly}` : `$${PRICING.standard.annual}`}
          priceUnit={
            cycle === "monthly"
              ? "/mo"
              : `/mo · billed $${PRICING.standard.annualTotal}/yr`
          }
          discountBadge={cycle === "annual" ? annualBadge : undefined}
          features={[
            "1 user",
            "All Sequence Studio features",
            "Calendar + Reports",
            "AI ideas + insights",
          ]}
          recommended={draft.creatorType !== "agency"}
        />
        <PlanCard
          active={plan === "pro"}
          onClick={() => setPlan("pro")}
          name="Pro"
          tagline="For agencies + multi-client teams."
          priceTop={cycle === "monthly" ? `$${PRICING.pro.monthly}` : `$${PRICING.pro.annual}`}
          priceUnit={
            cycle === "monthly"
              ? "/mo"
              : `/mo · billed $${PRICING.pro.annualTotal}/yr`
          }
          discountBadge={cycle === "annual" ? annualBadge : undefined}
          features={[
            "Unlimited users",
            "Multi-client workspaces",
            "Client-ready reports",
            "Priority support",
          ]}
          recommended={draft.creatorType === "agency"}
        />
      </div>
      <p className="text-[11.5px] text-muted text-center mt-5">
        7-day free trial · No charge today · Cancel anytime
      </p>
    </>
  );
}

/* ─── 9. Workspace ready ─────────────────────────────────────────── */

export function StepReady({
  displayName,
  focusLabel,
  quickActions,
  onPick,
}: {
  displayName: string;
  focusLabel: string;
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
        Trial active · 7 days
      </div>
      <h1 className="text-[32px] font-semibold tracking-[-0.015em] text-text leading-tight">
        Welcome to CreatorHub,
        <br />
        {displayName.split(/\s+/)[0]}.
      </h1>
      <p className="text-[14px] text-muted mt-3 max-w-[480px] mx-auto leading-relaxed">
        Your workspace is built around{" "}
        <span className="text-accent font-medium">{focusLabel}</span>.
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
