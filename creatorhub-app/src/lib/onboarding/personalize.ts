/* Personalization helpers — pure functions reading from a Profile.
   All callers must handle profile === null with sensible fallbacks. */

import type { Profile, CreatorType, Goal } from "./types";
import { creatorTypes, goals, niches, brandTones, sellingTypes } from "./options";
import type { PersonaKey } from "@/lib/mock/story";

const PERSONA_BY_TYPE: Record<CreatorType, PersonaKey> = {
  creator: "coach",
  infoproduct: "coach",
  agency: "agency",
  tattoo: "tattoo",
  fitness: "fitness",
  realestate: "realestate",
  brand: "agency",
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
  return goals.find((g) => g.key === goal)?.label ?? goal;
}

export function welcomeCopy(profile: Profile | null): { greeting: string; sub: string } {
  if (!profile) {
    return {
      greeting: "Welcome back, Ella",
      sub: "Here's how this week is going so far.",
    };
  }
  const first = displayNameFor(profile).split(/\s+/)[0];
  const focus = welcomeFocus(profile.primaryGoal);
  return {
    greeting: `Welcome back, ${first}`,
    sub: focus,
  };
}

function welcomeFocus(goal: Goal): string {
  switch (goal) {
    case "audience":
      return "Let's grow this week's reach.";
    case "dms":
      return "Let's turn content into conversations.";
    case "appointments":
      return "Let's plan this week's bookings.";
    case "sell":
      return "Let's move the offer this week.";
    case "consistency":
      return "Let's keep the streak going.";
    case "analytics":
      return "Here's what your numbers are saying.";
    case "sequences":
      return "Let's build a sequence today.";
    case "clients":
      return "Here's where each client stands.";
    case "authority":
      return "Let's plant a few authority posts.";
    case "reports":
      return "Reports are ready when you are.";
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
    /* Route by primary goal. */
    return primaryActionForGoal(profile.primaryGoal);
  }
  return {
    label: "Connect Instagram",
    href: "/integrations",
    hint: "Finish connecting to unlock real data.",
  };
}

export function quickActionsFor(profile: Profile): NextAction[] {
  const primary = primaryActionForGoal(profile.primaryGoal);
  const others: NextAction[] = [
    { label: "Add assets", href: "/library", hint: "Photos + short videos for sequences." },
    { label: "Open Dashboard", href: "/dashboard", hint: "See your KPIs at a glance." },
    { label: "Open Calendar", href: "/calendar", hint: "Plan the week ahead." },
    { label: "Open Reports", href: "/reports", hint: "Weekly + monthly summaries." },
    { label: "Open Sequence Studio", href: "/sequence-studio", hint: "Pick assets, build a sequence." },
    { label: "Connect Instagram", href: "/integrations", hint: "Unlock real data." },
  ];
  /* Drop the primary action from "others" if duplicated, then take 2 more. */
  const filtered = others.filter((o) => o.href !== primary.href);
  return [primary, ...filtered.slice(0, 2)];
}

function primaryActionForGoal(goal: Goal): NextAction {
  switch (goal) {
    case "audience":
    case "dms":
    case "appointments":
    case "sell":
      return {
        label: "Build a sequence",
        href: "/sequence-studio",
        hint: "Pick assets and ship.",
      };
    case "consistency":
    case "analytics":
    case "reports":
      return {
        label: "Open Dashboard",
        href: "/dashboard",
        hint: "Today's numbers + next moves.",
      };
    case "clients":
      return {
        label: "Open Reports",
        href: "/reports",
        hint: "Weekly client-ready summaries.",
      };
    case "sequences":
    case "authority":
      return {
        label: "Open Sequence Studio",
        href: "/sequence-studio",
        hint: "Sequences are why you're here.",
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
