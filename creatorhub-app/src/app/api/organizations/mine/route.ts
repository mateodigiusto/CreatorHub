/**
 * GET /api/organizations/mine
 *
 * Lists every organization the signed-in user belongs to, newest
 * membership first, with the active org flagged. Feeds the OrgSwitcher
 * dropdown.
 *
 * The active org comes from `getSession()` — the single source of truth
 * for cookie-aware org resolution — so the switcher and the rest of the
 * app never disagree about which org is active.
 */

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { listOrganizationsForUser } from "@/lib/orgs/queries";
import { log } from "@/lib/log";

export async function GET() {
  const session = await getSession();
  if (!session) {
    /* No session → either unauthenticated or no memberships yet. Either
       way the switcher has nothing to show. */
    return NextResponse.json({ organizations: [], activeOrgId: null });
  }

  try {
    const supabase = await getSupabaseServer();
    const organizations = await listOrganizationsForUser({
      supabase,
      userId: session.userId,
      activeOrgId: session.organization.id,
    });
    return NextResponse.json({
      organizations,
      activeOrgId: session.organization.id,
    });
  } catch (err) {
    log.error("organizations.mine.failed", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
