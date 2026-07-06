/**
 * POST /api/outreach/generate
 *
 * Generates a personalized outreach draft for an editor → creator pitch.
 * Pulls:
 *   - editor's profile + portfolio bio/specialties (if built)
 *   - target creator from creator_directory
 *   - up to 3 most recent content_analyses by source_creator matching
 *     the target's handle (so the message can reference real videos)
 *
 * Body:
 *   {
 *     creatorId: uuid     — target from creator_directory
 *     method: 'dm' | 'email' | 'comment' | 'voice_note'  (default 'dm')
 *   }
 *
 * Returns the draft. The editor is expected to review + edit before
 * sending. POSTING the actual outreach to the log is a separate
 * /api/outreach/log endpoint (future).
 *
 * Falls back to a stub draft when ANTHROPIC_API_KEY is unset so dev /
 * preview deploys keep working.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { audit } from "@/lib/audit";
import {
  completeJson,
  isAnthropicConfigured,
} from "@/lib/content-dna/providers/claude";
import {
  OUTREACH_SYSTEM,
  outreachPrompt,
  type OutreachOutput,
  type AnalysisExcerpt,
  type CreatorContext,
} from "@/lib/scripts/outreach-prompts";
import type { Profile } from "@/lib/onboarding/types";

const VALID_METHODS = new Set(["dm", "email", "comment", "voice_note"]);

type Body = {
  creatorId?: string;
  method?: "dm" | "email" | "comment" | "voice_note";
};

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.creatorId) {
    return NextResponse.json({ error: "missing_creator_id" }, { status: 400 });
  }
  const method = body.method && VALID_METHODS.has(body.method) ? body.method : "dm";

  /* Pull editor profile + portfolio + target creator + recent analyses
     in parallel. Each query is RLS-scoped to the editor's own data
     (except creator_directory which is open to authenticated reads). */
  const [profileRes, portfolioRes, creatorRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("editor_portfolios")
      .select("bio, specialties")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("creator_directory")
      .select("id, handle, display_name, niche, bio, primary_platform")
      .eq("id", body.creatorId)
      .maybeSingle(),
  ]);

  type CreatorRow = {
    id: string;
    handle: string;
    display_name: string | null;
    niche: string;
    bio: string | null;
    primary_platform: string;
  };
  type PortfolioLite = { bio: string | null; specialties: string[] };

  const creator = (creatorRes.data ?? null) as CreatorRow | null;
  if (!creator) {
    return NextResponse.json({ error: "creator_not_found" }, { status: 404 });
  }

  /* Match transcripts by handle (case-insensitive). The editor would
     have analyzed the creator's videos via the Transcribe & Analyze
     flow before pitching. Up to 3 most recent. */
  const handleNeedle = creator.handle.replace(/^@/, "");
  const { data: analysesData } = await supabase
    .from("content_analyses")
    .select("hook, themes, steal_notes, source_creator")
    .eq("user_id", userId)
    .ilike("source_creator", `%${handleNeedle}%`)
    .order("created_at", { ascending: false })
    .limit(3);

  const analyses = (analysesData ?? []) as AnalysisExcerpt[];

  const profile = (profileRes.data as Profile | null) ?? null;
  const portfolio = (portfolioRes.data ?? null) as PortfolioLite | null;

  const creatorContext: CreatorContext = {
    handle: creator.handle,
    display_name: creator.display_name,
    niche: creator.niche,
    bio: creator.bio,
    primary_platform: creator.primary_platform,
  };

  let result: OutreachOutput;
  let provider: "claude" | "stub" = "stub";

  if (isAnthropicConfigured()) {
    try {
      result = await completeJson<OutreachOutput>({
        system: OUTREACH_SYSTEM,
        prompt: outreachPrompt({
          editorProfile: profile,
          editorBio: portfolio?.bio ?? null,
          editorSpecialties: portfolio?.specialties ?? [],
          creator: creatorContext,
          analyses,
          method,
        }),
        maxTokens: 1500,
      });
      provider = "claude";
    } catch (err) {
      log.warn("outreach.generate.claude_fallback", {
        error: err instanceof Error ? err.message : "unknown",
      });
      result = stubOutreach(creatorContext, method, analyses.length);
    }
  } else {
    result = stubOutreach(creatorContext, method, analyses.length);
  }

  /* Audit the call so the cost-guardrails dashboard can roll it up.
     Stub generations are excluded — they don't cost anything. */
  if (provider === "claude") {
    await audit(userId, {
      actor: "user",
      action: "outreach.generated",
      targetType: "creator_directory",
      targetId: creator.id,
      metadata: { method, transcripts: analyses.length },
    });
  }

  return NextResponse.json({
    draft: result,
    provider,
    transcriptsUsed: analyses.length,
    needsTranscripts: analyses.length === 0,
  });
}

/* Stub fallback — used when ANTHROPIC_API_KEY is unset OR Claude failed.
   Deterministic enough to demo the flow without API access. */
function stubOutreach(
  creator: CreatorContext,
  method: "dm" | "email" | "comment" | "voice_note",
  transcriptCount: number,
): OutreachOutput {
  const ref = transcriptCount > 0
    ? `Just watched your last ${transcriptCount} video${transcriptCount === 1 ? "" : "s"} on ${creator.niche.toLowerCase()}`
    : `Been following your ${creator.niche.toLowerCase()} content for a few weeks`;
  const subject = method === "email"
    ? `Quick edit idea for your ${creator.primary_platform} content`
    : "";
  const message = method === "comment"
    ? `${ref} — that pacing in your hook section is exactly the rhythm I edit for. Sliding into your DMs.`
    : `${ref}. The thing I'd love to test is tightening the first 3 seconds — I edit short-form for ${creator.niche.toLowerCase()} creators and the hook tweak usually 2–3x's retention. Happy to do a free 60-second edit on your next video so you can see what I mean before any commitment. Worth a try?`;
  const references = transcriptCount > 0
    ? [`Last ${transcriptCount} video${transcriptCount === 1 ? "" : "s"} (auto-transcribed)`]
    : [];
  return {
    subject,
    message,
    rationale: transcriptCount > 0
      ? "Opens with a specific reference to recent content and pivots to a low-friction free-edit ask."
      : "No transcripts available — encourage the editor to transcribe 2-3 of the creator's recent videos first, then regenerate for a sharper opener.",
    references,
  };
}
