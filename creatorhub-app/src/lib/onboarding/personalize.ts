/* Personalization helpers — pure functions reading from a Profile.
   All callers must handle profile === null with sensible fallbacks. */

import type { Profile, CreatorType, Goal } from "./types";
import { creatorTypes, niches, brandTones, sellingTypes } from "./options";
import type { PersonaKey } from "@/lib/mock/story";

const PERSONA_BY_TYPE: Record<CreatorType, PersonaKey> = {
  creator: "coach",
  infoproduct: "coach",
  agency: "agency",
  fitness: "fitness",
  realestate: "realestate",
  other: "coach",
};

export function personaForProfile(profile: Profile | null): PersonaKey {
  if (!profile) return "coach";
  return PERSONA_BY_TYPE[profile.creatorType] ?? "coach";
}

export function displayNameFor(profile: Profile | null): string {
  if (profile?.displayName?.trim()) return profile.displayName.trim();
  if (!profile) return "Ella Moreno";
  /* Fall back to the creator-type label. */
  return creatorTypes.find((c) => c.key === profile.creatorType)?.label ?? "Creator";
}

export function avatarInitialsFor(profile: Profile | null): string {
  const name = displayNameFor(profile);
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function handleFor(profile: Profile | null): string {
  if (profile?.handle?.trim()) return profile.handle.trim().replace(/^@/, "");
  if (!profile) return "ella.moreno";
  const name = displayNameFor(profile);
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, "")
    .trim()
    .replace(/\s+/g, ".")
    .slice(0, 24) || "creator";
}

export function creatorTypeLabel(profile: Profile | null): string {
  if (!profile) return "Pro plan · 2 seats";
  return creatorTypes.find((c) => c.key === profile.creatorType)?.label ?? "Creator";
}

export function nicheLabel(profile: Profile | null): string {
  if (!profile) return "creator";
  const preset = niches.find((n) => n.key === profile.niche);
  return preset?.label ?? profile.niche;
}

export function goalLabel(goal: Goal | undefined): string {
  if (!goal) return "your goal";
  return goal;
}

export function welcomeCopy(profile: Profile | null): { greeting: string; sub: string } {
  if (!profile) {
    return {
      greeting: "Welcome back, Ella",
      sub: "Here's how this week is going so far.",
    };
  }
  const first = displayNameFor(profile).split(/\s+/)[0];
  return {
    greeting: `Welcome back, ${first}`,
    sub: welcomeFocusFor(profile),
  };
}

/* Driven by creatorType — no longer reads primaryGoal (dropped from v2 flow). */
function welcomeFocusFor(profile: Profile): string {
  switch (profile.creatorType) {
    case "agency":
      return "Here's how each client is doing this week.";
    case "infoproduct":
      return "Let's move the offer this week.";
    case "creator":
      return "Let's grow your audience this week.";
    case "realestate":
      return "Let's plan listings + neighborhood content.";
    case "fitness":
      return "Let's plan transformations + programming.";
    case "other":
      return "Here's how this week is going so far.";
  }
}

/* Recommended next action for the dashboard "Next move" callout
   AND the post-onboarding success screen quick-action bar. */
export type NextAction = {
  label: string;
  href: string;
  hint: string;
};

export function nextActionFor(profile: Profile | null): NextAction {
  if (!profile) {
    return {
      label: "Connect Instagram",
      href: "/integrations",
      hint: "Pull in real performance data.",
    };
  }
  if (profile.startMode === "demo") {
    return primaryActionForType(profile.creatorType);
  }
  return {
    label: "Connect Instagram",
    href: "/integrations",
    hint: "Finish connecting to unlock real data.",
  };
}

export function quickActionsFor(profile: Profile): NextAction[] {
  const primary = primaryActionForType(profile.creatorType);
  const others: NextAction[] = [
    { label: "Add assets", href: "/library", hint: "Photos + short videos for sequences." },
    { label: "Open Dashboard", href: "/dashboard", hint: "See your KPIs at a glance." },
    { label: "Open Calendar", href: "/calendar", hint: "Plan the week ahead." },
    { label: "Open Reports", href: "/reports", hint: "Weekly + monthly summaries." },
    { label: "Open Sequence Studio", href: "/sequence-studio", hint: "Pick assets, build a sequence." },
    { label: "Connect Instagram", href: "/integrations", hint: "Unlock real data." },
  ];
  const filtered = others.filter((o) => o.href !== primary.href);
  return [primary, ...filtered.slice(0, 2)];
}

function primaryActionForType(type: CreatorType): NextAction {
  switch (type) {
    case "agency":
      return {
        label: "Open Reports",
        href: "/reports",
        hint: "Weekly client-ready summaries.",
      };
    case "infoproduct":
      return {
        label: "Build a sequence",
        href: "/sequence-studio",
        hint: "Pick assets and ship the offer.",
      };
    case "creator":
    case "realestate":
    case "fitness":
      return {
        label: "Open Sequence Studio",
        href: "/sequence-studio",
        hint: "Pick assets, build a sequence.",
      };
    case "other":
      return {
        label: "Open Dashboard",
        href: "/dashboard",
        hint: "Today's numbers + next moves.",
      };
  }
}

/* Brand-tone helpers — for Sequence Studio default seeding. */
export function defaultBrandToneLabel(profile: Profile | null): string | null {
  if (!profile || profile.brandTones.length === 0) return null;
  return brandTones.find((b) => b.key === profile.brandTones[0])?.label ?? null;
}

/* Free-text offer hint for the Sequence brief placeholder. */
export function offerHint(profile: Profile | null): string | null {
  if (!profile) return null;
  if (profile.offerName?.trim()) return profile.offerName.trim();
  const sells = profile.selling
    .map((s) => sellingTypes.find((o) => o.key === s)?.label)
    .filter(Boolean)
    .slice(0, 1)[0];
  return sells ?? null;
}

/* Convenience boolean for surfaces that show a "demo mode" banner. */
export function isDemoMode(profile: Profile | null): boolean {
  return profile?.startMode === "demo";
}
