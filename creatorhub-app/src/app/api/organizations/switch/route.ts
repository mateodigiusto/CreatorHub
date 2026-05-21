/**
 * POST /api/organizations/switch  { organizationId }
 *
 * Sets the `creatorhub-active-org` cookie after verifying the caller has
 * a membership for the target org. Returns 403 `not_a_member` otherwise,
 * so the endpoint can't be used to force-route into a foreign org.
 *
 * The client refreshes the page after a 200 — `getSession()` then reads
 * the new cookie via `resolveActiveOrgId()` and every `/clients/*` query
 * re-scopes to the switched org.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/orgs/types";
import { log } from "@/lib/log";

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    organizationId?: string;
  } | null;
  const organizationId =
    typeof body?.organizationId === "string" ? body.organizationId : "";
  if (!organizationId) {
    return NextResponse.json({ error: "missing_organization_id" }, { status: 400 });
  }

  /* Membership check — RLS scopes to self, plus an explicit profile_id
     filter. Zero rows → the caller isn't a member. */
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("profile_id", auth.user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "not_a_member" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, organizationId });
  res.cookies.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  log.info("organizations.switched", {
    userId: auth.user.id,
    organizationId,
  });
  return res;
}
