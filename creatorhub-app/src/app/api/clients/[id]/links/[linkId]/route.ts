/**
 * DELETE /api/clients/[id]/links/[linkId] — remove a saved link.
 * RLS only lets the user who added the link delete it.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  const { id, linkId } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("relationship_links")
    .delete()
    .eq("id", linkId)
    .eq("relationship_id", id);
  if (error) {
    log.error("clients.link_delete_failed", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
