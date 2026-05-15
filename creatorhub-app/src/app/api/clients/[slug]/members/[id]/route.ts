/**
 * DELETE /api/clients/[slug]/members/[id] — remove a member from a client.
 * RLS allows any org-staff to write; the row's organization scope is
 * enforced by the FK + the sync_client_membership_org trigger.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireClientAccess } from "@/lib/auth/require-client-access";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type Params = { params: Promise<{ slug: string; id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const { client } = await requireClientAccess(slug);
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("client_memberships")
    .delete()
    .eq("id", id)
    .eq("client_id", client.id);
  if (error) {
    log.error("client_members.delete_failed", { slug, id, err: error.message });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
