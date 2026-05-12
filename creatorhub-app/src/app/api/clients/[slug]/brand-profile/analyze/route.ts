/**
 * POST /api/clients/[slug]/brand-profile/analyze
 *
 * Body: { transcript: string }
 *
 * Response: { suggestions: AnalyzerSuggestion[], tokensUsed: number }
 *
 * Plan-gated via `assertPlanAllows("aiAnalyzer")` — currently a no-op stub
 * until Phase 6 lights it up. Limits transcript size to 25k estimated tokens
 * (~88k chars) to keep one call's cost predictable.
 *
 * STAGED. Move to src/app/api/clients/[slug]/brand-profile/analyze/ at cutover.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  getAgencySession,
  requireClientAccess,
  requireOrgRole,
  assertPlanAllows,
  HttpError,
  httpErrorResponse,
} from "@/lib/agency/phase3-stubs";
import { analyzeTranscript } from "@/lib/ai/analyze-transcript";
import { MAX_TRANSCRIPT_TOKENS } from "@/lib/ai/anthropic";
import { log } from "@/lib/log";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    requireOrgRole(session, ["user", "editor", "director"]);
    assertPlanAllows(session, "aiAnalyzer");
    await requireClientAccess(slug);

    let body: { transcript?: unknown };
    try {
      body = (await req.json()) as { transcript?: unknown };
    } catch {
      throw new HttpError(400, "invalid_json");
    }
    const transcript = body.transcript;
    if (typeof transcript !== "string") {
      throw new HttpError(400, "transcript_required");
    }
    if (transcript.trim().length < 80) {
      throw new HttpError(400, "transcript_too_short");
    }

    let result;
    try {
      result = await analyzeTranscript(transcript);
    } catch (err) {
      const message = err instanceof Error ? err.message : "ai_error";
      if (message === "transcript_too_long") {
        throw new HttpError(413, "transcript_too_long", {
          maxTokens: MAX_TRANSCRIPT_TOKENS,
        });
      }
      if (message === "ai_response_malformed") {
        throw new HttpError(502, "ai_response_malformed");
      }
      log.error("brand_profile.analyze_failed", err);
      throw new HttpError(502, "ai_upstream_error");
    }

    return NextResponse.json(result);
  } catch (err) {
    return httpErrorResponse(err);
  }
}
