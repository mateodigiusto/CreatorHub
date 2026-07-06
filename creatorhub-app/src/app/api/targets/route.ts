/**
 * GET  /api/targets  — list current user's saved targets (joined with directory)
 * POST /api/targets  — body { creatorId, status?, notes? } — save a creator
 *
 * The list endpoint includes the joined creator_directory row so the
 * /outreach page renders the pitch list without a second fetch.
 *
 * Filters on GET (optional):
 *   ?status=pitched|responded|client|pass
 */

import { NextResponse, type NextRequest } from "next/server";
import { withAudit } from "@/lib/audit";
import { schema } from "@/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

const VALID_STATUS = new Set([
  "pitched", "responded", "client", "pass",
]);

type PostBody = {
  creatorId?: string;
  status?: string;
  notes?: string | null;
};

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("editor_creator_targets")
    .select("*, creator:creator_directory(*)")
    .eq("user_id", userRes.user.id)
    .order("added_at", { ascending: false });

  if (status && VALID_STATUS.has(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    log.error("targets.list.failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  return NextResponse.json({ targets: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.creatorId) {
    return NextResponse.json({ error: "missing_creator_id" }, { status: 400 });
  }
  const status = body.status && VALID_STATUS.has(body.status)
    ? (body.status as "pitched" | "responded" | "client" | "pass")
    : "pitched";

  /* Confirm the creator exists in the directory. If not, 404 — don't let
     stale UI write a row pointing nowhere. */
  const { data: creator } = await supabase
    .from("creator_directory")
    .select("id")
    .eq("id", body.creatorId)
    .maybeSingle();
  if (!creator) {
    return NextResponse.json({ error: "creator_not_found" }, { status: 404 });
  }

  let inserted: { id: string } | null = null;
  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "target.created",
        targetType: "editor_creator_target",
        metadata: { creatorId: body.creatorId, status },
      },
      async (tx) => {
        /* Upsert: re-saving the same creator just refreshes notes/status. */
        const rows = await tx
          .insert(schema.editorCreatorTargets)
          .values({
            userId,
            creatorId: body.creatorId!,
            status,
            notes: body.notes ?? null,
          })
          .onConflictDoUpdate({
            target: [
              schema.editorCreatorTargets.userId,
              schema.editorCreatorTargets.creatorId,
            ],
            set: {
              status,
              notes: body.notes ?? null,
            },
          })
          .returning({ id: schema.editorCreatorTargets.id });
        inserted = rows[0];
      },
    );
  } catch (err) {
    log.error("targets.create.failed", err);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: (inserted as { id: string } | null)?.id ?? null });
}
