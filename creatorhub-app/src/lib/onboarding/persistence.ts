import type { Profile, ProfileDraft } from "./types";

const KEY = "creatorhub-profile";
const FLAG = "creatorhub-onboarded";
const DRAFT_KEY = "creatorhub-onboarding-draft";

/* Resumable onboarding: persists the in-progress draft + step to localStorage
   on every change so a reload doesn't lose the user's place. Cleared on
   completion (writeProfile) and on Restart Setup (clearProfile). */

export type OnboardingDraftSnapshot = {
  step: number;
  draft: ProfileDraft;
  savedAt: number;
};

export function readOnboardingDraft(): OnboardingDraftSnapshot | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingDraftSnapshot;
    /* Stale-draft cleanup — discard anything older than 30 days. */
    const ageDays = (Date.now() - parsed.savedAt) / 86_400_000;
    if (ageDays > 30) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeOnboardingDraft(snapshot: OnboardingDraftSnapshot): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
  } catch {}
}

export function clearOnboardingDraft(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function readProfile(): Profile | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    /* v1 profiles are intentionally rejected — onboarding v2 forces every
       existing user back through the new flow. They keep the row in localStorage
       but the app treats them as un-onboarded until they complete v2. */
    if (parsed?.version !== 2) return null;
    return parsed as Profile;
  } catch {
    return null;
  }
}

export function writeProfile(profile: Profile): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
    localStorage.setItem(FLAG, "true");
    /* Onboarding completed → discard any half-finished draft. */
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function clearProfile(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(FLAG);
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function isOnboardedSync(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-onboarded") === "true";
}
