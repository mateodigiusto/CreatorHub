/**
 * GET /api/scripts/[id]/export-pdf
 *
 * Streams a downloadable PDF of a single script. Owner-only (RLS on
 * generated_scripts) — same permission model as GET /api/scripts/[id].
 *
 * Filename: CreatorHub_Script_<slugified-title>_<YYYY-MM-DD>.pdf
 *
 * @react-pdf/renderer is bulky (~2MB) — keep the import inside the
 * handler so cold-starts on other routes don't pay the cost.
 */

import { type NextRequest } from "next/server";
import {
  getSupabaseServer,
} from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";

type RouteContext = { params: Promise<{ id: string }> };

type ScriptRow = {
  id: string;
  title: string | null;
  hook: string | null;
  setup: string | null;
  key_points: Array<{ title: string; body: string }>;
  cta: string | null;
  b_roll_notes: string | null;
  format: string;
  platform: string;
  status: string;
  created_at: string;
};

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const relationshipId = req.nextUrl.searchParams.get("relationship_id");
  const eff = await resolveEffectiveUser(supabase, userRes.user.id, relationshipId);
  if (!eff.ok) {
    return new Response(JSON.stringify({ error: eff.error }), {
      status: eff.status,
      headers: { "content-type": "application/json" },
    });
  }
  const reader = readerFor(supabase, eff.isClient);

  const { data, error } = await reader
    .from("generated_scripts")
    .select(
      "id, title, hook, setup, key_points, cta, b_roll_notes, format, platform, status, created_at",
    )
    .eq("id", id)
    .eq("user_id", eff.userId)
    .maybeSingle();

  if (error) {
    log.error("scripts.export_pdf.load_failed", error);
    return new Response(JSON.stringify({ error: "load_failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const script = (data ?? null) as ScriptRow | null;
  if (!script) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  /* Lazy-load both react-pdf and the renderer component to keep the cold
     start on other API routes lean. The renderer needs to run server-side. */
  const [{ renderToBuffer }, { ScriptPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/script-pdf"),
  ]);

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      ScriptPdf({
        script: {
          title: script.title,
          hook: script.hook,
          setup: script.setup,
          keyPoints: Array.isArray(script.key_points) ? script.key_points : [],
          cta: script.cta,
          bRollNotes: script.b_roll_notes,
          format: script.format,
          platform: script.platform,
          status: script.status,
          createdAt: script.created_at,
        },
      }),
    );
  } catch (err) {
    log.error("scripts.export_pdf.render_failed", err);
    return new Response(JSON.stringify({ error: "render_failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const filename = buildFilename(script.title, script.created_at);

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

function buildFilename(title: string | null, createdAt: string): string {
  const slug = (title ?? "script")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "script";
  const date = new Date(createdAt).toISOString().slice(0, 10);
  return `CreatorHub_Script_${slug}_${date}.pdf`;
}
