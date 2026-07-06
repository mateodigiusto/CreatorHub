/**
 * DELETE /api/team/invites/[id] — revoke a pending staff invite.
 * Org-admin only.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireAgency } from "@/lib/auth/require-org";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireAgency();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "admin_required" }, { status: 403 });
  }

  const supabase = await getSupabaseServer();
  const res = await supabase
    .from("organization_invites")
    .delete()
    .eq("id", id)
    .eq("organization_id", session.organization.id);
  if (res.error) {
    log.error("team.invite_revoke_failed", { id, err: res.error.message });
    return NextResponse.json({ error: "revoke_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
