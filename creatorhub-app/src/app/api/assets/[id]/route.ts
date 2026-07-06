/**
 * DELETE /api/assets/[id]
 *
 * Removes the asset row + storage object. RLS scopes by `auth.uid()`, so
 * a user can't target someone else's asset by id-guessing.
 *
 * Storage cleanup is best-effort: if the bucket delete fails (object
 * already gone, transient error) we still drop the DB row so the user
 * doesn't see a phantom tile. The orphan-storage cron sweeps stale objects.
 */

import { NextResponse } from "next/server";
import { withAudit } from "@/lib/audit";
import { eq, and } from "drizzle-orm";
import { schema } from "@/db";
import {
  getSupabaseServer,
  getSupabaseServiceRole,
} from "@/lib/supabase/server";
import { log } from "@/lib/log";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  /* Fetch via the user's RLS context first so a 404 means "not yours" not
     "doesn't exist anywhere" — denies oracle attacks. */
  const { data: row } = await supabase
    .from("assets")
    .select("id, storage_key, thumbnail_storage_key")
    .eq("id", id)
    .returns<
      Array<{
        id: string;
        storage_key: string;
        thumbnail_storage_key: string | null;
      }>
    >()
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "asset.deleted",
        targetType: "asset",
        targetId: id,
      },
      async (tx) => {
        await tx
          .delete(schema.assets)
          .where(and(eq(schema.assets.id, id), eq(schema.assets.userId, userId)));
      },
    );
  } catch (err) {
    log.error("assets.delete.failed", err, { assetId: id });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  /* Best-effort storage cleanup. Service role required because the user's
     own session can't issue cross-bucket deletes for thumbnails. */
  const admin = getSupabaseServiceRole();
  const keys = [row.storage_key];
  if (row.thumbnail_storage_key) keys.push(row.thumbnail_storage_key);
  await admin.storage.from("originals").remove(keys).catch((err) => {
    log.warn("assets.delete.storage_remove_failed", {
      assetId: id,
      msg: err instanceof Error ? err.message : "unknown",
    });
  });

  return NextResponse.json({ ok: true });
}
