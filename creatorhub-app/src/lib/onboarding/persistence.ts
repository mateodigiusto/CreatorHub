import type { Profile } from "./types";

const KEY = "creatorhub-profile";
const FLAG = "creatorhub-onboarded";

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
  } catch {}
}

export function clearProfile(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(FLAG);
  } catch {}
}

export function isOnboardedSync(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-onboarded") === "true";
}
