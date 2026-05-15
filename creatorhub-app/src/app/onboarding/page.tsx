"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppState } from "@/lib/store";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import {
  StepWelcome,
  StepAccountType,
  StepAgencyName,
  StepAgencyTeam,
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
import {
  readOnboardingDraft,
  writeOnboardingDraft,
} from "@/lib/onboarding/persistence";

/* ─── Step flow ──────────────────────────────────────────────────────
   Onboarding forks at "account-type" into an agency branch and a solo
   branch. Each branch is a fixed key array; conditional steps (the solo
   "offer" step) are skipped by advance() rather than removed from the
   array, so step indices never shift under the user. */

type StepKey =
  | "welcome"
  | "account-type"
  | "agency-name"
  | "agency-team"
  | "creator-type"
  | "niche"
  | "offer"
  | "formats"
  | "audience"
  | "tone"
  | "problem"
  | "plan"
  | "ready";

const HEAD: StepKey[] = ["welcome", "account-type"];
const AGENCY_FLOW: StepKey[] = [
  ...HEAD,
  "agency-name",
  "agency-team",
  "plan",
  "ready",
];
const SOLO_FLOW: StepKey[] = [
  ...HEAD,
  "creator-type",
  "niche",
  "offer",
  "formats",
  "audience",
  "tone",
  "problem",
  "plan",
  "ready",
];

/* The solo "offer" step only applies to creator types that sell a named
   offer as their primary motion. */
function showsOfferStep(type: CreatorType | undefined): boolean {
  return type === "infoproduct" || type === "realestate";
}

function activeFlow(draft: ProfileDraft): StepKey[] {
  if (draft.accountType === "agency") return AGENCY_FLOW;
  if (draft.accountType === "solo") return SOLO_FLOW;
  return HEAD;
}

/* Move dir (+1 / -1) through the flow, skipping the conditional offer step. */
function advance(
  flow: StepKey[],
  index: number,
  draft: ProfileDraft,
  dir: 1 | -1,
): number {
  let n = index + dir;
  while (
    n > 0 &&
    n < flow.length - 1 &&
    flow[n] === "offer" &&
    !showsOfferStep(draft.creatorType)
  ) {
    n += dir;
  }
  return Math.max(0, Math.min(n, flow.length - 1));
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageInner />
    </Suspense>
  );
}

function OnboardingPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setProfile, profile: existingProfile } = useAppState();

  const stripeStatus = params.get("stripe");

  /* Resume mid-flow from a saved draft. Stripe-redirect intent overrides
     any stored step. */
  const resumed = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (existingProfile && existingProfile.version === 2) return null;
    return readOnboardingDraft();
  }, [existingProfile]);

  const [draft, setDraft] = useState<ProfileDraft>(
    existingProfile && existingProfile.version === 2
      ? { ...existingProfile }
      : (resumed?.draft ?? {
          secondaryGoals: [],
          platforms: ["instagram"],
          wantsNichePresets: true,
        }),
  );

  /* Initial step: Stripe round-trip jumps to the relevant step of the
     resumed flow; otherwise resume where the draft left off. */
  const initialStep = useMemo(() => {
    const flow = activeFlow(resumed?.draft ?? draft);
    if (stripeStatus === "success") return flow.length - 1; // ready
    if (stripeStatus === "cancel") return flow.indexOf("plan");
    return resumed?.step ?? 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [step, setStep] = useState(initialStep);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flow = activeFlow(draft);
  const key = flow[Math.min(step, flow.length - 1)];

  /* Persist the in-progress draft on every change so a reload resumes. */
  useEffect(() => {
    if (existingProfile && existingProfile.version === 2) return;
    writeOnboardingDraft({ step, draft, savedAt: Date.now() });
  }, [step, draft, existingProfile]);

  /* Stripe-success re-entry — make sure the org + profile landed. */
  useEffect(() => {
    if (stripeStatus !== "success") return;
    void createOrg();
    const p = buildProfile();
    setProfile(p);
    void persistProfile(p);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [stripeStatus]);

  function update(patch: Partial<ProfileDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function back() {
    setStep((s) => advance(activeFlow(draft), s, draft, -1));
  }
  function next() {
    setStep((s) => advance(activeFlow(draft), s, draft, 1));
  }

  function buildProfile(): Profile {
    const isAgency = draft.accountType === "agency";
    const trialPlan = draft.trial?.plan ?? (isAgency ? "pro" : "standard");
    const trialCycle = draft.trial?.cycle ?? "annual";
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      version: 2,
      completedAt: startedAt.toISOString(),
      displayName: draft.displayName ?? draft.agencyName,
      handle: draft.handle,
      creatorType: draft.creatorType ?? (isAgency ? "agency" : "creator"),
      niche: draft.niche ?? (isAgency ? "agency" : "coaching"),
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

  /* Create the founding organization. 409 (already_has_org) is success —
     the wizard may POST twice across a Stripe round-trip. */
  async function createOrg(): Promise<boolean> {
    const accountType = draft.accountType ?? "solo";
    const orgName =
      accountType === "agency"
        ? draft.agencyName?.trim() || "My Agency"
        : draft.displayName?.trim() || draft.niche?.trim() || "My Workspace";
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, kind: accountType }),
      });
      return res.ok || res.status === 409;
    } catch {
      return false;
    }
  }

  /* Persist the profile to the DB. Best-effort — a 401 (no session) leaves
     the localStorage copy as the source of truth. */
  async function persistProfile(profile: Profile) {
    try {
      await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
    } catch {
      /* network error — localStorage copy persists, retried next visit */
    }
  }

  /* Plan-step submit: create the org, write the profile, then Stripe (or
     the mock fallback when Stripe isn't configured). */
  async function finishSetup() {
    setSubmitting(true);
    setError(null);

    const orgOk = await createOrg();
    const p = buildProfile();
    setProfile(p);
    void persistProfile(p);

    const plan = draft.trial?.plan ?? (draft.accountType === "agency" ? "pro" : "standard");
    const cycle = draft.trial?.cycle ?? "annual";
    try {
      const res = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, cycle }),
      });
      if (res.ok) {
        const json = (await res.json()) as { url: string };
        window.location.href = json.url;
        return;
      }
      /* 503 stripe_not_configured / 401 → mock fallback below. */
    } catch {
      /* network error → mock fallback below */
    }

    setSubmitting(false);
    if (!orgOk) {
      setError("Couldn't finish setup — check your connection and try again.");
      return;
    }
    next(); // → ready
  }

  /* "Skip setup" — only offered once a track is chosen; fills gaps with
     defaults, creates the org, routes to the track home. */
  async function skip() {
    setSubmitting(true);
    const orgOk = await createOrg();
    const p = buildProfile();
    setProfile(p);
    void persistProfile(p);
    setSubmitting(false);
    if (!orgOk) {
      setError("Couldn't finish setup — check your connection and try again.");
      return;
    }
    router.replace(draft.accountType === "agency" ? "/clients" : "/dashboard");
  }

  /* Per-step gate. */
  const canNext = useMemo(() => {
    switch (key) {
      case "welcome":
        return true;
      case "account-type":
        return !!draft.accountType;
      case "agency-name":
        return !!draft.agencyName?.trim();
      case "agency-team":
        return true;
      case "creator-type":
        return !!draft.creatorType;
      case "niche":
        return !!draft.niche?.trim();
      case "offer":
        return true;
      case "formats":
        return (draft.contentFormats ?? []).length > 0;
      case "audience":
        return true;
      case "tone":
        return (draft.brandTones ?? []).length > 0;
      case "problem":
        return !!draft.biggestProblem;
      case "plan":
        return !!draft.trial?.plan && !!draft.trial?.cycle && !submitting;
      case "ready":
        return true;
      default:
        return true;
    }
  }, [key, draft, submitting]);

  const nextLabel =
    key === "welcome"
      ? "Get started"
      : key === "plan"
        ? submitting
          ? "Setting up…"
          : "Start 7-day free trial"
        : "Next";

  const homeHref = draft.accountType === "agency" ? "/clients" : "/dashboard";

  const profileForReady = useMemo(
    () => (key === "ready" ? buildProfile() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  /* Progress copy keyed off how far through the flow we are. */
  const motivational =
    flow.length > 4 && step === Math.floor(flow.length / 2)
      ? "Halfway there"
      : step === flow.length - 2
        ? "Almost done"
        : undefined;

  return (
    <OnboardingShell
      step={step}
      total={flow.length}
      motivational={motivational}
      canBack={step > 0 && key !== "ready"}
      canNext={canNext}
      nextLabel={nextLabel}
      hideFooter={key === "welcome" || key === "ready"}
      hideSkip={key === "account-type"}
      onBack={back}
      onNext={() => {
        if (key === "plan") {
          void finishSetup();
          return;
        }
        next();
      }}
      onSkip={() => void skip()}
    >
      {key === "welcome" && <StepWelcome onStart={next} />}
      {key === "account-type" && (
        <StepAccountType draft={draft} update={update} />
      )}
      {key === "agency-name" && (
        <StepAgencyName draft={draft} update={update} />
      )}
      {key === "agency-team" && (
        <StepAgencyTeam draft={draft} update={update} />
      )}
      {key === "creator-type" && (
        <StepCreatorType draft={draft} update={update} exclude={["agency"]} />
      )}
      {key === "niche" && <StepNiche draft={draft} update={update} />}
      {key === "offer" && <StepOffer draft={draft} update={update} />}
      {key === "formats" && (
        <StepContentFormats draft={draft} update={update} />
      )}
      {key === "audience" && <StepAudience draft={draft} update={update} />}
      {key === "tone" && <StepBrandTone draft={draft} update={update} />}
      {key === "problem" && (
        <StepBiggestProblem draft={draft} update={update} />
      )}
      {key === "plan" && (
        <>
          <StepPlan draft={draft} update={update} />
          {error && (
            <p className="text-[12.5px] text-error text-center mt-4">{error}</p>
          )}
        </>
      )}
      {key === "ready" && profileForReady && (
        <StepReady
          displayName={displayNameFor(profileForReady)}
          focusLabel={labelForType(profileForReady.creatorType)}
          quickActions={quickActionsFor(profileForReady)}
          homeHref={homeHref}
          onPick={(href) => router.replace(href)}
        />
      )}
    </OnboardingShell>
  );
}

function labelForType(type: CreatorType): string {
  switch (type) {
    case "creator":
      return "your personal brand";
    case "agency":
      return "running clients";
    case "infoproduct":
      return "your offer";
    case "realestate":
      return "listings + neighborhood";
    case "fitness":
      return "training + transformation";
    case "content_manager":
      return "your creators' accounts";
    case "editor":
      return "your client roster";
    case "other":
      return "your work";
  }
}
