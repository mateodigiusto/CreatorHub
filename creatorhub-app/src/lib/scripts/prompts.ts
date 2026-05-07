/**
 * Prompts + output shape for the AI Script Generator.
 *
 * Mirrors the content-dna prompt convention:
 *   - System prompt sets tone/role + JSON-only constraint
 *   - User prompt provides context (profile, format, optional source) + the
 *     exact JSON shape to return
 *   - Caller defends against fences with the existing claude.ts wrapper
 */

import type { Profile } from "@/lib/onboarding/types";

export const SCRIPT_SYSTEM = `You are an expert short-form video scriptwriter for creators. Your job is to write scripts that sound like the user wrote them — using their offer, niche, and voice — with the structural craft of a top creator. You are not a marketing copywriter; you are a creator who writes for camera.

Return ONLY valid JSON. No prose before or after. No markdown fences. Match the exact shape requested.`;

export type ScriptOutput = {
  title: string;
  hook: string;
  setup: string;
  key_points: Array<{ title: string; body: string }>;
  cta: string;
  b_roll_notes: string;
};

const FORMAT_DESCRIPTIONS: Record<string, string> = {
  reel: "60-90 second short-form vertical video. Hook (0-3s) → Setup (3-12s) → 2-4 key points → CTA. Tight pacing, one idea, one ask.",
  longform: "8-15 minute YouTube long-form video. Hook (0-30s) → Setup (30s-2min) → 3-6 key points → CTA. Each key point is its own self-contained micro-story.",
  vsl: "5-12 minute VSL (sales video). Pain → Problem → Promise → Proof → Plan → CTA. Lead with the result the viewer wants, not your offer.",
  story_sequence: "5-7 slide IG story sequence. Each key_point is one slide (text + frame). Hook is slide 1, CTA is the final slide. Slides build a single argument across taps.",
  email: "200-400 word email to a warm list. Subject line in `hook`. One idea, one CTA. Conversational tone — sounds like you talking, not marketing copy.",
};

export function scriptPrompt(args: {
  profile: Profile | null;
  platform: string;
  format: string;
  /* Optional source material — when set, the script is "in the structural
     style of" this transcript without copying its content. */
  sourceHook?: string | null;
  sourceThemes?: string[];
  sourceCreator?: string | null;
}): string {
  const profile = args.profile;
  const formatDesc = FORMAT_DESCRIPTIONS[args.format] ?? FORMAT_DESCRIPTIONS.reel;

  const profileBlock = profile
    ? `Creator profile:
- Type: ${profile.creatorType}
- Niche: ${profile.niche}
- Sells: ${profile.selling.join(", ") || "(unspecified)"}
- Offer: ${profile.offerName ?? "(unspecified)"}
- Audience: ${profile.audience.who || "(unspecified)"}
- Audience wants: ${profile.audience.wants || "(unspecified)"}
- Audience pain: ${profile.audience.problem || "(unspecified)"}
- Brand tones: ${profile.brandTones.join(", ") || "(default: direct, premium)"}
- Biggest content problem: ${profile.biggestProblem ?? "(unspecified)"}`
    : `Creator profile: (anonymous — write generically engaging content for the chosen platform/format)`;

  const sourceBlock = args.sourceHook
    ? `Inspired by this analyzed video (steal the STRUCTURE, not the content):
- Original hook: "${args.sourceHook}"
- Themes: ${(args.sourceThemes ?? []).join(", ") || "(none)"}
- Creator: ${args.sourceCreator ?? "(unknown)"}`
    : `No source material — generate from creator profile alone.`;

  return `${profileBlock}

Target:
- Platform: ${args.platform}
- Format: ${args.format} — ${formatDesc}

${sourceBlock}

Write ONE complete script. Output JSON with this exact shape:
{
  "title": "<short working title for the script, ≤60 chars>",
  "hook": "<the opening 1–3 sentences that earn the rest of the watch>",
  "setup": "<2–4 sentences bridging the hook into the body — frame the stakes>",
  "key_points": [
    {"title": "<beat name, ≤40 chars>", "body": "<what you'll say or show, 2–4 sentences>"},
    {"title": "...", "body": "..."}
  ],
  "cta": "<the single ask — save / share / DM / book / reply>",
  "b_roll_notes": "<2–4 sentences on visuals: what to shoot, what to overlay, when to cut. For email format, return 'N/A — email format'>"
}

Constraints:
- Match the format's structure (key_points count + length scales with format).
- Sound like the creator (use the brand tones above), not like an ad.
- The hook must be specific (a number, a contradiction, or a concrete moment) — never abstract.
- CTA must be ONE thing. No double-asks.
- If source material is provided, the structural pattern (hook style, beat shape, CTA cadence) should mirror it — but the topic and content are yours.`;
}
