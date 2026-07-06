/**
 * Prompts + output shape for the AI Outreach generator.
 *
 * Goal: a personalized DM/email an editor sends a creator. The KEY
 * differentiator vs. generic cold-outreach generators is that it
 * references the creator's actual content (transcripts surfaced from the
 * Transcribe & Analyze pipeline), so the message reads "I saw your last
 * 3 videos do X" instead of "I edit videos, want to work together?".
 *
 * If no analyses are available yet, this prompt still works but degrades
 * to "based on your niche" framing — the caller should encourage the
 * editor to transcribe a few of the creator's videos first.
 */

import type { Profile } from "@/lib/onboarding/types";

export const OUTREACH_SYSTEM = `You are an expert at writing cold outreach messages from video editors to creators. Your job is to write messages that read like one human noticed another human's actual work — not like a templated pitch. The editor's portfolio + the creator's recent content are both in the prompt; use both to make the message specific.

Return ONLY valid JSON. No prose. No markdown fences.`;

export type OutreachOutput = {
  subject: string;        // For email; for DM, return "" (empty string)
  message: string;        // The full message body
  rationale: string;      // 1-2 sentences explaining why this should land — for the editor's reference, not for sending
  references: string[];   // Specific things from the creator's content that the message cited
};

export type CreatorContext = {
  handle: string;
  display_name: string | null;
  niche: string;
  bio: string | null;
  primary_platform: string;
};

export type AnalysisExcerpt = {
  hook: string | null;
  themes: string[] | null;
  steal_notes: string | null;
  source_creator: string | null;
};

export function outreachPrompt(args: {
  /* The editor sending the message. */
  editorProfile: Profile | null;
  /* Editor's portfolio summary, if they've built one. */
  editorBio: string | null;
  editorSpecialties: string[];
  /* Target creator from the directory. */
  creator: CreatorContext;
  /* 0-3 transcripts of the creator's recent content. Empty array is OK. */
  analyses: AnalysisExcerpt[];
  /* What channel the editor will send this on — shapes tone + length. */
  method: "dm" | "email" | "comment" | "voice_note";
}): string {
  const { editorProfile, editorBio, editorSpecialties, creator, analyses, method } = args;

  const editorBlock = `Editor:
- Specialties: ${editorSpecialties.length > 0 ? editorSpecialties.join(", ") : "(general video editing)"}
- Bio: ${editorBio ?? "(no bio set)"}
- Brand tones: ${editorProfile?.brandTones?.join(", ") || "direct, premium"}`;

  const creatorBlock = `Target creator:
- Handle: ${creator.handle}
- Name: ${creator.display_name ?? "(unknown)"}
- Niche: ${creator.niche}
- Platform: ${creator.primary_platform}
- Bio: ${creator.bio ?? "(none)"}`;

  const analysesBlock = analyses.length === 0
    ? `Creator's recent content: NO TRANSCRIPTS AVAILABLE — write a message that opens with their niche / bio observations rather than specific videos.`
    : `Creator's recent content (${analyses.length} ${analyses.length === 1 ? "transcript" : "transcripts"}):
${analyses
  .map((a, i) =>
    `[${i + 1}] Hook: "${a.hook ?? "(no hook)"}"
   Themes: ${(a.themes ?? []).join(", ") || "(none)"}
   Worth borrowing: ${a.steal_notes ?? "(no notes)"}`,
  )
  .join("\n\n")}`;

  const channelBlock = method === "email"
    ? `Channel: email — 4–7 sentences. Has a subject line. Slightly more formal than a DM but still personal.`
    : method === "dm"
      ? `Channel: DM — 3–5 sentences MAX. Conversational. No subject line (return ""). Open with a specific observation, end with a low-friction ask.`
      : method === "comment"
        ? `Channel: public comment — 1–2 sentences. The actual outreach goes in DM after they reply. This is a "make them notice me" comment, not a pitch.`
        : `Channel: voice note — write what the editor would SAY in a 30-60 second voice note. Markdown not appropriate. Conversational, includes pauses ("…").`;

  return `${editorBlock}

${creatorBlock}

${analysesBlock}

${channelBlock}

Output JSON with this exact shape:
{
  "subject": "${method === "email" ? "<subject line, ≤60 chars, specific>" : ""}",
  "message": "<the full message body — match the channel's length + tone>",
  "rationale": "<1-2 sentences for the editor: why this opener should resonate with this creator>",
  "references": ["<specific things from the creator's content the message cited — empty array OK if no transcripts>"]
}

Hard rules:
- DO NOT use the words "amazing", "incredible", "love your content", "huge fan" — those are generic-cold-outreach tells.
- The first sentence must reference something specific to THIS creator. Either a video they posted (if transcripts present), a niche-specific observation, or their bio. Never a generic compliment.
- The ask must be low-friction. "Free 60-second edit on your next video" beats "let's hop on a call".
- Match the editor's brand tones above — if they're "direct, premium", don't write "hey friend!".`;
}
