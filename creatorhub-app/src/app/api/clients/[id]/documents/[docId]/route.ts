/**
 * DELETE /api/clients/[id]/documents/[docId] — detach a doc from this
 * relationship. The underlying asset is NOT deleted — the uploader still
 * owns it in their library.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("relationship_documents")
    .delete()
    .eq("id", docId)
    .eq("relationship_id", id);
  if (error) {
    log.error("clients.doc_detach_failed", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
