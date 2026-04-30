import type { Profile } from "./types";

const KEY = "creatorhub-profile";
const FLAG = "creatorhub-onboarded";

export function readProfile(): Profile | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return null;
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
