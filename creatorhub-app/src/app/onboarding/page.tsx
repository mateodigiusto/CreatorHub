"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/store";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import {
  StepWelcome,
  StepCreatorType,
  StepNiche,
  StepOffer,
  StepContentFormats,
  StepAudience,
  StepBrandTone,
  StepBiggestProblem,
  StepPlan,
  StepReady,
} from "@/components/onboarding/steps";
import type {
  Profile,
  ProfileDraft,
  CreatorType,
} from "@/lib/onboarding/types";
import {
  displayNameFor,
  quickActionsFor,
} from "@/lib/onboarding/personalize";

const TOTAL_STEPS = 10; // 0–9

const MOTIVATIONAL: Record<number, string | undefined> = {
  4: "Halfway there",
  7: "Almost done",
};

/* "Skip setup" defaults — any creatorType the user hasn't picked yet defaults
   to creator + uses a sensible Standard plan with no trial stamped. */
const SKIP_DEFAULTS: Profile = {
  version: 2,
  completedAt: new Date().toISOString(),
  creatorType: "creator",
  niche: "coaching",
  primaryGoal: "audience",
  secondaryGoals: [],
  platforms: ["instagram"],
  contentFormats: ["reels", "carousels"],
  frequency: "1-3",
  planningWorkflow: ["notes"],
  biggestProblem: "what-to-post",
  audience: { who: "", wants: "", problem: "" },
  selling: ["services"],
  ctaStyle: "dm-keyword",
  brandTones: ["direct", "premium"],
  sequenceUses: ["story-sequences"],
  wantsNichePresets: true,
  assetTypes: ["photos", "short-videos"],
  reportsNeeds: ["personal-weekly"],
  team: "solo",
  startMode: "demo",
};

/* Q3 (Offer) is conditional — only shown for creator types that actually
   sell to clients/customers as their primary motion. Personal Brand and
   Fitness skip straight to "What do you create?" */
function showsOfferStep(type: CreatorType | undefined): boolean {
  return type === "agency" || type === "infoproduct" || type === "realestate";
}

function nextStep(current: number, draft: ProfileDraft): number {
  let n = current + 1;
  if (n === 3 && !showsOfferStep(draft.creatorType)) n = 4;
  return Math.min(n, TOTAL_STEPS - 1);
}
function prevStep(current: number, draft: ProfileDraft): number {
  let n = current - 1;
  if (n === 3 && !showsOfferStep(draft.creatorType)) n = 2;
  return Math.max(n, 0);
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setProfile, profile: existingProfile } = useAppState();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(
    existingProfile && existingProfile.version === 2
      ? { ...existingProfile }
      : { secondaryGoals: [], platforms: ["instagram"], wantsNichePresets: true }
  );

  function update(patch: Partial<ProfileDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function back() {
    setStep((s) => prevStep(s, draft));
  }
  function next() {
    setStep((s) => nextStep(s, draft));
  }

  /* Persist to DB when the user has an authenticated session. Demo /
     unauthenticated visitors keep working off localStorage only — the
     POST is best-effort and silently no-ops on 401. */
  async function persistProfile(profile: Profile) {
    try {
      await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
    } catch {
      /* Network error — user already has localStorage copy, will retry next visit. */
    }
  }

  function skip() {
    setProfile(SKIP_DEFAULTS);
    void persistProfile(SKIP_DEFAULTS);
    router.replace("/dashboard");
  }

  function buildProfile(): Profile {
    const trialPlan = draft.trial?.plan ?? (draft.creatorType === "agency" ? "pro" : "standard");
    const trialCycle = draft.trial?.cycle ?? "annual";
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      version: 2,
      completedAt: startedAt.toISOString(),
      displayName: draft.displayName,
      handle: draft.handle,
      creatorType: draft.creatorType ?? "creator",
      niche: draft.niche ?? "coaching",
      /* Legacy fields v1 still types as required — fill with sensible defaults. */
      primaryGoal: "audience",
      secondaryGoals: [],
      platforms: ["instagram"],
      contentFormats: draft.contentFormats ?? [],
      frequency: "1-3",
      planningWorkflow: [],
      biggestProblem: draft.biggestProblem ?? "what-to-post",
      audience: {
        who: draft.audience?.who ?? "",
        wants: draft.audience?.wants ?? "",
        problem: draft.audience?.problem ?? "",
      },
      selling: draft.selling ?? [],
      offerName: draft.offerName,
      ctaStyle: "dm-keyword",
      brandTones: draft.brandTones ?? [],
      sequenceUses: [],
      wantsNichePresets: true,
      assetTypes: [],
      reportsNeeds: ["personal-weekly"],
      team: "solo",
      startMode: "demo",
      trial: {
        plan: trialPlan,
        cycle: trialCycle,
        startedAt: startedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  /* Per-step gate: can the user click Next? */
  const canNext = useMemo(() => {
    switch (step) {
      case 0: return true;
      case 1: return !!draft.creatorType;
      case 2: return !!draft.niche?.trim();
      case 3: return true; /* Offer is fully optional */
      case 4: return (draft.contentFormats ?? []).length > 0;
      case 5: return true; /* Audience is optional */
      case 6: return (draft.brandTones ?? []).length > 0;
      case 7: return !!draft.biggestProblem;
      case 8: return !!draft.trial?.plan && !!draft.trial?.cycle;
      case 9: return true;
      default: return true;
    }
  }, [step, draft]);

  const nextLabel =
    step === 0 ? "Get started" :
    step === 8 ? "Start 7-day free trial" :
    "Next";

  const isReady = step === 9;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const profileForReady = useMemo(() => (isReady ? buildProfile() : null), [isReady]);
  const focusLabel = profileForReady
    ? labelForType(profileForReady.creatorType)
    : "your work";

  return (
    <OnboardingShell
      step={step}
      total={TOTAL_STEPS}
      motivational={MOTIVATIONAL[step]}
      canBack={step > 0 && step < 9}
      canNext={canNext}
      nextLabel={nextLabel}
      hideFooter={step === 0 || step === 9}
      onBack={back}
      onNext={() => {
        if (step === 8) {
          const p = buildProfile();
          setProfile(p);
          void persistProfile(p);
        }
        next();
      }}
      onSkip={skip}
    >
      {step === 0 && <StepWelcome onStart={next} />}
      {step === 1 && <StepCreatorType draft={draft} update={update} />}
      {step === 2 && <StepNiche draft={draft} update={update} />}
      {step === 3 && <StepOffer draft={draft} update={update} />}
      {step === 4 && <StepContentFormats draft={draft} update={update} />}
      {step === 5 && <StepAudience draft={draft} update={update} />}
      {step === 6 && <StepBrandTone draft={draft} update={update} />}
      {step === 7 && <StepBiggestProblem draft={draft} update={update} />}
      {step === 8 && <StepPlan draft={draft} update={update} />}
      {step === 9 && profileForReady && (
        <StepReady
          displayName={displayNameFor(profileForReady)}
          focusLabel={focusLabel}
          quickActions={quickActionsFor(profileForReady)}
          onPick={(href) => router.replace(href)}
        />
      )}
    </OnboardingShell>
  );
}

function labelForType(type: CreatorType): string {
  switch (type) {
    case "creator":     return "your personal brand";
    case "agency":      return "running clients";
    case "infoproduct": return "your offer";
    case "realestate":  return "listings + neighborhood";
    case "fitness":     return "training + transformation";
    case "other":       return "your work";
  }
}
