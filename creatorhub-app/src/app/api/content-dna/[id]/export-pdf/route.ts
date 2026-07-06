/**
 * GET /api/content-dna/[id]/export-pdf
 *
 * Streams a downloadable PDF of a single competitor breakdown. Owner-only
 * (RLS on content_analyses). Honors `?relationship_id=` so editors acting
 * as a client can export their client's breakdown.
 *
 * Filename: CreatorHub_Breakdown_<slugified-title>_<YYYY-MM-DD>.pdf
 *
 * @react-pdf/renderer is bulky (~2MB) — kept inside the handler so other
 * routes don't pay the cold-start cost.
 */

import { type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";
import type {
  StructureBeat,
  WhyItWorked,
} from "@/lib/content-dna/types";

type RouteContext = { params: Promise<{ id: string }> };

type AnalysisRow = {
  id: string;
  source_url: string;
  source_platform: string;
  source_title: string | null;
  source_creator: string | null;
  transcription: string | null;
  hook: string | null;
  hook_analysis: {
    text: string;
    why_it_works: string;
    attention_arc: string[];
  } | null;
  structure: StructureBeat[] | null;
  why_it_worked: WhyItWorked | null;
  themes: string[] | null;
  tone: string | null;
  cta: string | null;
  content_score: number | null;
  steal_notes: string | null;
  status: string;
  created_at: string;
};

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return jsonError("unauthorized", 401);
  }

  const relationshipId = req.nextUrl.searchParams.get("relationship_id");
  const eff = await resolveEffectiveUser(supabase, userRes.user.id, relationshipId);
  if (!eff.ok) {
    return jsonError(eff.error, eff.status);
  }
  const reader = readerFor(supabase, eff.isClient);

  const { data, error } = await reader
    .from("content_analyses")
    .select(
      "id, source_url, source_platform, source_title, source_creator, " +
        "transcription, hook, hook_analysis, structure, why_it_worked, " +
        "themes, tone, cta, content_score, steal_notes, status, created_at",
    )
    .eq("id", id)
    .eq("user_id", eff.userId)
    .maybeSingle();

  if (error) {
    log.error("content_dna.export_pdf.load_failed", error);
    return jsonError("load_failed", 500);
  }
  const analysis = (data ?? null) as AnalysisRow | null;
  if (!analysis) return jsonError("not_found", 404);
  if (analysis.status !== "ready") {
    return jsonError("analysis_not_ready", 409);
  }

  const [{ renderToBuffer }, { ContentDnaPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/content-dna-pdf"),
  ]);

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      ContentDnaPdf({
        analysis: {
          sourceTitle: analysis.source_title,
          sourceCreator: analysis.source_creator,
          sourceUrl: analysis.source_url,
          sourcePlatform: analysis.source_platform,
          hook: analysis.hook,
          hookAnalysis: analysis.hook_analysis,
          structure: analysis.structure,
          whyItWorked: analysis.why_it_worked,
          themes: analysis.themes,
          tone: analysis.tone,
          cta: analysis.cta,
          contentScore: analysis.content_score,
          stealNotes: analysis.steal_notes,
          transcription: analysis.transcription,
          createdAt: analysis.created_at,
        },
      }),
    );
  } catch (err) {
    log.error("content_dna.export_pdf.render_failed", err);
    return jsonError("render_failed", 500);
  }

  const filename = buildFilename(analysis.source_title, analysis.created_at);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(buffer.length),
      "cache-control": "private, max-age=0, no-store",
    },
  });
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function buildFilename(title: string | null, createdAt: string): string {
  const slug = (title ?? "breakdown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "breakdown";
  const date = new Date(createdAt).toISOString().slice(0, 10);
  return `CreatorHub_Breakdown_${slug}_${date}.pdf`;
}
