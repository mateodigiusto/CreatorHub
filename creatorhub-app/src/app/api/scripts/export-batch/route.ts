/**
 * GET /api/scripts/export-batch?ids=a,b,c[&relationship_id=...]
 *
 * Streams a single PDF containing one page per script. Cap is 50 scripts
 * per export — beyond that the rendering is slow enough to time out the
 * serverless function and the PDF gets unwieldy.
 *
 * Order in the file matches the order in `ids`. Missing or non-owned ids
 * are silently dropped (so a single bad id doesn't fail the whole export).
 *
 * Filename: CreatorHub_Scripts_<count>_<YYYY-MM-DD>.pdf
 */

import { type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";

const MAX_BATCH = 50;

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

export async function GET(req: NextRequest) {
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

  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return jsonError("missing_ids", 400);
  if (ids.length > MAX_BATCH) return jsonError("too_many_ids", 400);

  const { data, error } = await reader
    .from("generated_scripts")
    .select(
      "id, title, hook, setup, key_points, cta, b_roll_notes, format, platform, status, created_at",
    )
    .eq("user_id", eff.userId)
    .in("id", ids);

  if (error) {
    log.error("scripts.export_batch.load_failed", error);
    return jsonError("load_failed", 500);
  }
  const rows = (data ?? []) as ScriptRow[];
  if (rows.length === 0) return jsonError("not_found", 404);

  /* Re-sort to match the order of `ids` so the user gets the order they
     selected, not whatever Postgres returned. */
  const orderIndex = new Map(ids.map((id, i) => [id, i]));
  rows.sort(
    (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
  );

  const [{ renderToBuffer }, { ScriptBatchPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/script-pdf"),
  ]);

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      ScriptBatchPdf({
        scripts: rows.map((r) => ({
          title: r.title,
          hook: r.hook,
          setup: r.setup,
          keyPoints: Array.isArray(r.key_points) ? r.key_points : [],
          cta: r.cta,
          bRollNotes: r.b_roll_notes,
          format: r.format,
          platform: r.platform,
          status: r.status,
          createdAt: r.created_at,
        })),
      }),
    );
  } catch (err) {
    log.error("scripts.export_batch.render_failed", err);
    return jsonError("render_failed", 500);
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `CreatorHub_Scripts_${rows.length}_${date}.pdf`;

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
