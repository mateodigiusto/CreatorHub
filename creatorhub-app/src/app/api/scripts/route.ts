/**
 * GET  /api/scripts           — list current user's generated scripts
 * POST /api/scripts/generate  — generate a new draft (see ./generate/route.ts)
 *
 * GET supports `status` filter (draft|approved|used|archived) and `platform`
 * filter. Always paginated by created_at desc, default 50 rows.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseServer,
} from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";

const VALID_STATUS = new Set(["draft", "approved", "used", "archived"]);
const VALID_PLATFORM = new Set([
  "instagram", "tiktok", "youtube", "linkedin", "x", "facebook",
]);

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const editorId = userRes.user.id;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const relationshipId = searchParams.get("relationship_id");
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50),
  );

  const eff = await resolveEffectiveUser(supabase, editorId, relationshipId);
  if (!eff.ok) {
    return NextResponse.json({ error: eff.error }, { status: eff.status });
  }

  /* Own data via RLS, client data via service role + explicit user_id
     filter (membership check above is the security boundary). */
  const reader = readerFor(supabase, eff.isClient);
  let query = reader
    .from("generated_scripts")
    .select("*")
    .eq("user_id", eff.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && VALID_STATUS.has(status)) {
    query = query.eq("status", status as "draft" | "approved" | "used" | "archived");
  }
  if (platform && VALID_PLATFORM.has(platform)) {
    query = query.eq(
      "platform",
      platform as "instagram" | "tiktok" | "youtube" | "linkedin" | "x" | "facebook",
    );
  }

  const { data, error } = await query;
  if (error) {
    log.error("scripts.list.failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  return NextResponse.json({ scripts: data ?? [], actingAsClient: eff.isClient });
}
