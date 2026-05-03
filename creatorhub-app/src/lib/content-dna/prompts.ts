/**
 * Prompts + output shapes for the two Claude calls.
 *
 * Both prompts ask for raw JSON only (no fences, no prose). The Claude
 * wrapper still strips fences defensively.
 */

export const ANALYSIS_SYSTEM = `You are an expert content strategist analyzing viral short-form videos. Your job is to extract the structural and psychological patterns that made a piece of content work, so a creator can replicate the technique without copying the content.

Return ONLY valid JSON. No prose before or after. No markdown fences.`;

export type AnalysisOutput = {
  hook: string;
  structure: {
    name: string;
    timestamp: string;
    description: string;
  }[];
  why_it_worked: {
    hook_psychology: string;
    retention_triggers: string[];
    emotional_pattern: string;
    story_structure: string;
  };
  variations: {
    hooks: string[];
    angles: string[];
    titles: string[];
  };
};

export function analysisPrompt(args: {
  platform: string;
  title: string | null;
  creator: string | null;
  transcript: string;
}): string {
  return `Platform: ${args.platform}
Title: ${args.title ?? "(unknown)"}
Creator: ${args.creator ?? "(unknown)"}
Transcript:
"""
${args.transcript.slice(0, 8000)}
"""

Output a JSON object with this exact shape:
{
  "hook": "<the opening 1–2 sentence verbatim hook>",
  "structure": [
    {"name": "Hook", "timestamp": "0:00–0:03", "description": "..."},
    {"name": "Setup", "timestamp": "0:03–0:08", "description": "..."}
  ],
  "why_it_worked": {
    "hook_psychology": "1–2 sentences on the cognitive lever (curiosity gap, pattern interrupt, status threat, etc.)",
    "retention_triggers": ["3–5 short bullets on what kept people watching"],
    "emotional_pattern": "1 sentence on the emotional arc",
    "story_structure": "1 sentence naming the structure (problem-solution, before-after, hidden-pattern, etc.)"
  },
  "variations": {
    "hooks": ["5 different opening hooks the creator could test, same psychological lever"],
    "angles": ["5 distinct angle pivots — same structure, different topic"],
    "titles": ["5 alternative title or thumbnail copy options"]
  }
}`;
}

export const DRAFT_SYSTEM = `You are an expert short-form video scriptwriter. Given an analysis of a viral piece of content, generate a fresh script for the user that uses the SAME structural pattern but for THEIR audience and offer.

Return ONLY valid JSON. No prose. No markdown fences.`;

export type DraftOutput = {
  script: string;
  hooks: string[];
  shots: { description: string; duration_seconds: number }[];
  captions: string[];
};

export function draftPrompt(args: {
  analysisHook: string | null;
  analysisStructure: unknown;
  analysisWhy: unknown;
  angle: string | null;
  audience: string | null;
  tone: string | null;
  targetPlatform: string | null;
}): string {
  return `Source analysis:
Hook: ${args.analysisHook ?? "(unknown)"}
Structure: ${JSON.stringify(args.analysisStructure ?? null)}
Why it worked: ${JSON.stringify(args.analysisWhy ?? null)}

Your direction:
Angle: ${args.angle ?? "(open)"}
Audience: ${args.audience ?? "(open)"}
Tone: ${args.tone ?? "(natural)"}
Target platform: ${args.targetPlatform ?? "(short-form vertical)"}

Output JSON with this exact shape:
{
  "script": "Full 30–45 second script. Use line breaks between beats. Match the source's structural pattern but for the user's angle/audience.",
  "hooks": ["3 alternative opening lines, each 1 sentence"],
  "shots": [
    {"description": "Shot 1: ...", "duration_seconds": 3},
    {"description": "Shot 2: ...", "duration_seconds": 4}
  ],
  "captions": ["3 caption variants for the target platform"]
}`;
}
