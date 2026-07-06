/**
 * POST /api/inbox/read — mark inbox feed items read.
 *
 * Body: { id?: string } — mark one event read; omit `id` to mark every
 * unread event in the caller's org read.
 *
 * Agency-staff only. RLS (`inbox_events` update policy = `is_org_staff`)
 * scopes the write to the caller's org, so no explicit org filter needed.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireAgency } from "@/lib/auth/require-org";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

export async function POST(req: NextRequest) {
  const session = await requireAgency();
  const body = (await req.json().catch(() => null)) as { id?: string } | null;

  const supabase = await getSupabaseServer();
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("inbox_events")
    .update({ read_at: nowIso } as never)
    .eq("organization_id", session.organization.id)
    .is("read_at", null);
  if (body?.id) query = query.eq("id", body.id);

  const res = await query;
  if (res.error) {
    log.error("inbox.mark_read_failed", { err: res.error.message });
    return NextResponse.json({ error: "mark_read_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
