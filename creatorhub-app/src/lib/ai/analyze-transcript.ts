/**
 * Transcript → brand-profile suggestions.
 *
 * Pipes the user's transcript through Anthropic with a constrained system
 * prompt that forces a JSON array of suggestions, one per inferable field.
 *
 * Returns >= 5 suggestions for non-trivial transcripts (the system prompt
 * requires the model to flag low-confidence guesses rather than skip
 * fields), so the UI always has something to render.
 */

import "server-only";
import {
  ANTHROPIC_MODEL,
  MAX_TRANSCRIPT_TOKENS,
  estimateTokens,
  getAnthropic,
} from "./anthropic";
import {
  BRAND_BUILD_FIELDS,
  STRATEGY_FIELDS,
  type AnalyzerResult,
  type AnalyzerSuggestion,
} from "@/lib/agency/workspace-types";

const ALL_FIELDS = [...BRAND_BUILD_FIELDS, ...STRATEGY_FIELDS, "contentPillars"] as const;
type Field = (typeof ALL_FIELDS)[number];

const SYSTEM_PROMPT = `You are a brand strategist analyzing a transcript from a creator interview, podcast, or call.

Your job: extract structured suggestions for a brand profile. Return a JSON array. Each item is:
{
  "field": one of [${ALL_FIELDS.map((f) => `"${f}"`).join(", ")}],
  "value": string (or string[] for "contentPillars"),
  "rationale": string (1 sentence; quote-or-paraphrase from the transcript),
  "confidence": number 0–1
}

Rules:
- Return AT LEAST 5 entries. Flag low-confidence guesses (confidence < 0.5) rather than skipping fields.
- Each "value" must be writable directly into a textarea — concise, complete, no markdown.
- For "contentPillars", return an array of 3–5 short pillar names (each <= 4 words).
- Never invent facts. If a field has no signal, omit it (but the floor is 5 entries total — fall back to "voice", "audiencePersona", "uniqueValueProp" with confidence ≤ 0.4 if you must).
- Return ONLY the JSON array. No preface, no closing remarks, no code fences.`;

type AnthropicLike = {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Array<{ role: "user"; content: string }>;
    }): Promise<{
      content: Array<{ type: string; text?: string }>;
      usage: { input_tokens: number; output_tokens: number };
    }>;
  };
};

export async function analyzeTranscript(
  transcript: string
): Promise<AnalyzerResult> {
  const trimmed = transcript.trim();
  if (trimmed.length === 0) {
    throw new Error("transcript_empty");
  }
  if (estimateTokens(trimmed) > MAX_TRANSCRIPT_TOKENS) {
    throw new Error("transcript_too_long");
  }

  const client = (await getAnthropic()) as AnthropicLike;
  const resp = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2_500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Transcript:\n\n${trimmed}\n\nReturn the JSON array now.`,
      },
    ],
  });

  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");

  const suggestions = parseSuggestions(text);
  return {
    suggestions,
    tokensUsed: resp.usage.input_tokens + resp.usage.output_tokens,
  };
}

const FIELD_SET = new Set<string>(ALL_FIELDS);

function parseSuggestions(raw: string): AnalyzerSuggestion[] {
  // Be forgiving: strip leading/trailing prose around a JSON array.
  const open = raw.indexOf("[");
  const close = raw.lastIndexOf("]");
  if (open === -1 || close === -1 || close <= open) {
    throw new Error("ai_response_malformed");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(open, close + 1));
  } catch {
    throw new Error("ai_response_malformed");
  }
  if (!Array.isArray(parsed)) throw new Error("ai_response_malformed");

  const out: AnalyzerSuggestion[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const field = e.field;
    const value = e.value;
    const rationale = e.rationale;
    const confidence = e.confidence;
    if (typeof field !== "string" || !FIELD_SET.has(field)) continue;
    if (typeof rationale !== "string") continue;
    if (typeof confidence !== "number" || confidence < 0 || confidence > 1) continue;
    if (field === "contentPillars") {
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) continue;
      out.push({
        field: "contentPillars",
        value: (value as string[]).map((v) => v.trim()).filter(Boolean),
        rationale,
        confidence,
      });
    } else {
      if (typeof value !== "string") continue;
      out.push({
        field: field as Field as Exclude<Field, "contentPillars">,
        value: value.trim(),
        rationale,
        confidence,
      });
    }
  }
  return out;
}
