/**
 * POST /api/scripts/generate
 *
 * Generates a new script draft. Today this calls `generateStubScript()`
 * (deterministic placeholder). When Workstream H lands, swap to a real
 * Claude call against the script-generator prompt without touching this
 * route's signature.
 *
 * Body:
 *   {
 *     platform: 'instagram' | 'tiktok' | …,
 *     format: 'reel' | 'longform' | 'vsl' | 'story_sequence' | 'email',
 *     sourceAnalysisId?: uuid     // optional — script "inspired by" a transcript
 *   }
 *
 * Returns the new draft row.
 */

import { NextResponse, type NextRequest } from "next/server";
import { withAudit } from "@/lib/audit";
import { schema } from "@/db";
import {
  getSupabaseServer,
} from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";
import { generateStubScript, type ScriptFormat } from "@/lib/scripts/stubs";
import {
  completeJson,
  isAnthropicConfigured,
} from "@/lib/content-dna/providers/claude";
import {
  SCRIPT_SYSTEM,
  scriptPrompt,
  type ScriptOutput,
} from "@/lib/scripts/prompts";
import type { Profile } from "@/lib/onboarding/types";

const VALID_FORMATS = new Set<ScriptFormat>([
  "reel", "longform", "vsl", "story_sequence", "email",
]);
const VALID_PLATFORMS = new Set([
  "instagram", "tiktok", "youtube", "linkedin", "x", "facebook",
]);

type Body = {
  platform?: string;
  format?: string;
  sourceAnalysisId?: string | null;
};

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const editorId = userRes.user.id;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.platform || !VALID_PLATFORMS.has(body.platform)) {
    return NextResponse.json({ error: "invalid_platform" }, { status: 400 });
  }
  if (!body.format || !VALID_FORMATS.has(body.format as ScriptFormat)) {
    return NextResponse.json({ error: "invalid_format" }, { status: 400 });
  }

  /* Resolve "acting as" client. When set, profile + source-analysis
     reads + the generated_scripts insert all use the client's user_id. */
  const relationshipId = req.nextUrl.searchParams.get("relationship_id");
  const eff = await resolveEffectiveUser(supabase, editorId, relationshipId);
  if (!eff.ok) {
    return NextResponse.json({ error: eff.error }, { status: eff.status });
  }
  const userId = eff.userId;

  /* Pull profile for personalization context. Pull source analysis
     (if requested) to feed hook + themes into the generator. When
     acting as a client, both reads use service-role + explicit user_id
     filter; the membership check above is the security boundary. */
  type AnalysisLite = {
    hook: string | null;
    themes: string[] | null;
    source_creator: string | null;
  };
  const reader = readerFor(supabase, eff.isClient);
  const [profileRes, analysisRes] = await Promise.all([
    reader.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    body.sourceAnalysisId
      ? reader
          .from("content_analyses")
          .select("hook, themes, source_creator")
          .eq("id", body.sourceAnalysisId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const analysis = (analysisRes.data ?? null) as AnalysisLite | null;
  if (body.sourceAnalysisId && !analysis) {
    return NextResponse.json({ error: "source_not_found" }, { status: 404 });
  }

  const profile = (profileRes.data as Profile | null) ?? null;

  /* Real Claude path when ANTHROPIC_API_KEY is set. Stub fallback keeps
     dev / preview deploys working without the key. The shape returned by
     either path matches StubScript so the DB insert below doesn't care
     which one ran. */
  let generated: ScriptOutput | ReturnType<typeof generateStubScript>;
  let provider: "claude" | "stub" = "stub";
  if (isAnthropicConfigured()) {
    try {
      generated = await completeJson<ScriptOutput>({
        system: SCRIPT_SYSTEM,
        prompt: scriptPrompt({
          profile,
          platform: body.platform,
          format: body.format as ScriptFormat,
          sourceHook: analysis?.hook ?? null,
          sourceThemes: analysis?.themes ?? [],
          sourceCreator: analysis?.source_creator ?? null,
        }),
      });
      provider = "claude";
    } catch (err) {
      /* Claude failed (rate limit, timeout, parse error) — fall back to
         stub so the user always gets a draft they can edit. Logged so we
         can spot a degraded-AI day in Sentry. */
      log.warn("scripts.generate.claude_fallback", {
        error: err instanceof Error ? err.message : "unknown",
      });
      generated = generateStubScript({
        profile,
        platform: body.platform,
        format: body.format as ScriptFormat,
        sourceHook: analysis?.hook ?? null,
        sourceThemes: analysis?.themes ?? [],
      });
    }
  } else {
    generated = generateStubScript({
      profile,
      platform: body.platform,
      format: body.format as ScriptFormat,
      sourceHook: analysis?.hook ?? null,
      sourceThemes: analysis?.themes ?? [],
    });
  }

  /* Normalize field names — Claude returns snake_case to match the prompt
     contract; stub uses camelCase. Map both into a single shape. */
  const stub = "key_points" in generated
    ? {
        title: generated.title,
        hook: generated.hook,
        setup: generated.setup,
        keyPoints: generated.key_points,
        cta: generated.cta,
        bRollNotes: generated.b_roll_notes,
      }
    : generated;

  let inserted: { id: string } | null = null;
  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "script.generated",
        targetType: "generated_script",
        metadata: {
          platform: body.platform,
          format: body.format,
          sourceAnalysisId: body.sourceAnalysisId ?? null,
          provider,
        },
      },
      async (tx) => {
        const rows = await tx
          .insert(schema.generatedScripts)
          .values({
            userId,
            sourceAnalysisId: body.sourceAnalysisId ?? null,
            platform: body.platform as
              "instagram" | "tiktok" | "youtube" | "linkedin" | "x" | "facebook",
            format: body.format as ScriptFormat,
            title: stub.title,
            hook: stub.hook,
            setup: stub.setup,
            keyPoints: stub.keyPoints,
            cta: stub.cta,
            bRollNotes: stub.bRollNotes,
            status: "draft",
          })
          .returning({ id: schema.generatedScripts.id });
        inserted = rows[0];
      },
    );
  } catch (err) {
    log.error("scripts.generate.failed", err);
    return NextResponse.json({ error: "generate_failed" }, { status: 500 });
  }

  if (!inserted) {
    return NextResponse.json({ error: "generate_failed" }, { status: 500 });
  }

  /* Re-read so we return the canonical row shape (with timestamps + status).
     Use the same reader as before — service role for client mode. */
  const { data } = await reader
    .from("generated_scripts")
    .select("*")
    .eq("id", (inserted as { id: string }).id)
    .single();

  /* Future: monthly cap check. When script_preferences.monthly_cap is set
     (or the plan tier implies a cap), count this user's generations this
     month and 429 before generation. */

  return NextResponse.json({ script: data });
}
