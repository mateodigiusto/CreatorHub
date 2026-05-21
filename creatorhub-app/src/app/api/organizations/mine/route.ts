/**
 * GET /api/organizations/mine
 *
 * Lists every organization the signed-in user belongs to, newest
 * membership first, with the active org flagged. Feeds the OrgSwitcher
 * dropdown.
 */

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveOrgId } from "@/lib/orgs/active-org";
import { listOrganizationsForUser } from "@/lib/orgs/queries";
import { log } from "@/lib/log";

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const activeOrgId = await resolveActiveOrgId({
      supabase,
      userId: auth.user.id,
    });
    const organizations = await listOrganizationsForUser({
      supabase,
      userId: auth.user.id,
      activeOrgId,
    });
    return NextResponse.json({ organizations, activeOrgId });
  } catch (err) {
    log.error("organizations.mine.failed", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
