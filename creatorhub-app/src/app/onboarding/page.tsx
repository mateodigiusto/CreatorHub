"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/store";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import {
  StepWelcome,
  StepCreatorType,
  StepNiche,
  StepGoal,
  StepPlatforms,
  StepContentShape,
  StepWorkflowProblem,
  StepAudience,
  StepSelling,
  StepCtaTone,
  StepStudioLibrary,
  StepReportsTeam,
  StepConnect,
  StepSummary,
  StepReady,
} from "@/components/onboarding/steps";
import type { Profile, ProfileDraft } from "@/lib/onboarding/types";
import {
  displayNameFor,
  goalLabel,
  quickActionsFor,
} from "@/lib/onboarding/personalize";

const TOTAL_STEPS = 15; // 0–14

const MOTIVATIONAL: Record<number, string | undefined> = {
  7: "Halfway there",
  11: "Almost done",
  13: "Let's review",
};

/* Minimum viable defaults for the "skip setup" flow. */
const SKIP_DEFAULTS: Profile = {
  version: 1,
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

export default function OnboardingPage() {
  const router = useRouter();
  const { setProfile, profile: existingProfile } = useAppState();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(
    existingProfile
      ? { ...existingProfile }
      : { secondaryGoals: [], platforms: ["instagram"], wantsNichePresets: true }
  );

  function update(patch: Partial<ProfileDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }
  function next() {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
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

  /* Pure — safe to call during render. Saving lives at the call site so
     it never accidentally fires from a useMemo. */
  function buildProfile(): Profile {
    return {
      version: 1,
      completedAt: new Date().toISOString(),
      displayName: draft.displayName,
      handle: draft.handle,
      creatorType: draft.creatorType ?? "creator",
      niche: draft.niche ?? "coaching",
      primaryGoal: draft.primaryGoal ?? "audience",
      secondaryGoals: draft.secondaryGoals ?? [],
      platforms: draft.platforms ?? ["instagram"],
      contentFormats: draft.contentFormats ?? [],
      frequency: draft.frequency ?? "1-3",
      planningWorkflow: draft.planningWorkflow ?? [],
      biggestProblem: draft.biggestProblem ?? "what-to-post",
      audience: {
        who: draft.audience?.who ?? "",
        wants: draft.audience?.wants ?? "",
        problem: draft.audience?.problem ?? "",
      },
      selling: draft.selling ?? [],
      offerName: draft.offerName,
      ctaStyle: draft.ctaStyle ?? "dm-keyword",
      customCta: draft.customCta,
      brandTones: draft.brandTones ?? [],
      sequenceUses: draft.sequenceUses ?? [],
      wantsNichePresets: draft.wantsNichePresets ?? true,
      assetTypes: draft.assetTypes ?? [],
      reportsNeeds: draft.reportsNeeds ?? [],
      team: draft.team ?? "solo",
      startMode: draft.startMode ?? "demo",
    };
  }

  /* Per-step gate: can the user click Next? */
  const canNext = useMemo(() => {
    switch (step) {
      case 0: return true;
      case 1: return !!draft.creatorType;
      case 2: return !!draft.niche?.trim();
      case 3: return !!draft.primaryGoal;
      case 4: return (draft.platforms ?? []).length > 0;
      case 5: return (draft.contentFormats ?? []).length > 0 && !!draft.frequency;
      case 6: return (draft.planningWorkflow ?? []).length > 0 && !!draft.biggestProblem;
      case 7: return true;
      case 8: return true;
      case 9: return !!draft.ctaStyle && (draft.brandTones ?? []).length > 0;
      case 10: return (draft.sequenceUses ?? []).length > 0 && (draft.assetTypes ?? []).length > 0;
      case 11: return (draft.reportsNeeds ?? []).length > 0 && !!draft.team;
      case 12: return !!draft.startMode;
      case 13: return true;
      case 14: return true;
      default: return true;
    }
  }, [step, draft]);

  const nextLabel =
    step === 0 ? "Get started" :
    step === 13 ? "Build my workspace" :
    "Next";

  const isReady = step === 14;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const profileForReady = useMemo(() => (isReady ? buildProfile() : null), [isReady]);

  return (
    <OnboardingShell
      step={step}
      total={TOTAL_STEPS}
      motivational={MOTIVATIONAL[step]}
      canBack={step > 0 && step < 14}
      canNext={canNext}
      nextLabel={nextLabel}
      hideFooter={step === 0 || step === 14}
      onBack={back}
      onNext={() => {
        if (step === 13) {
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
      {step === 3 && <StepGoal draft={draft} update={update} />}
      {step === 4 && <StepPlatforms draft={draft} update={update} />}
      {step === 5 && <StepContentShape draft={draft} update={update} />}
      {step === 6 && <StepWorkflowProblem draft={draft} update={update} />}
      {step === 7 && <StepAudience draft={draft} update={update} />}
      {step === 8 && <StepSelling draft={draft} update={update} />}
      {step === 9 && <StepCtaTone draft={draft} update={update} />}
      {step === 10 && <StepStudioLibrary draft={draft} update={update} />}
      {step === 11 && <StepReportsTeam draft={draft} update={update} />}
      {step === 12 && <StepConnect draft={draft} update={update} />}
      {step === 13 && (
        <StepSummary draft={draft} update={update} goToStep={setStep} />
      )}
      {step === 14 && profileForReady && (
        <StepReady
          displayName={displayNameFor(profileForReady)}
          primaryGoalLabel={goalLabel(profileForReady.primaryGoal).toLowerCase()}
          quickActions={quickActionsFor(profileForReady)}
          onPick={(href) => router.replace(href)}
        />
      )}
    </OnboardingShell>
  );
}
