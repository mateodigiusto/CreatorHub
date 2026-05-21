/**
 * POST /api/organizations/create-additional  { name, kind? }
 *
 * Creates an *additional* organization for a user who already belongs to
 * one or more. Unlike POST /api/organizations (the founding-org route,
 * which 409s if a membership exists), this is the multi-org path: it
 * always creates, adds the caller as `is_admin = true`, and switches the
 * active-org cookie to the new org.
 *
 * No `assertPlanAllows` gate — plan limits in Phase 6 are per-org, not
 * per-user, and the plan has no "max orgs per user" cap. See Phase 9
 * NOTES "Plan-limit considerations".
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/orgs/types";
import { log } from "@/lib/log";

const MAX_SLUG_RETRIES = 6;

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48);
  return base || `agency-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    kind?: string;
  } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  const kind: "agency" | "solo" = body?.kind === "solo" ? "solo" : "agency";

  const service = getSupabaseServiceRole();

  /* Guard against the user belonging to nothing — this route is for
     *additional* orgs. A user with zero memberships should go through
     the founding-org route (POST /api/organizations) so onboarding
     state stays consistent. */
  const existing = await service
    .from("organization_memberships")
    .select("id")
    .eq("profile_id", user.id)
    .limit(1);
  if (!existing.data || existing.data.length === 0) {
    return NextResponse.json({ error: "no_founding_org" }, { status: 409 });
  }

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let orgId: string | null = null;
  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await service
      .from("organizations")
      .insert({
        slug,
        name,
        kind,
        created_by: user.id,
        plan: "pro",
        subscription_status: "trialing",
        trial_ends_at: trialEnd,
      })
      .select("id, slug")
      .single();
    if (data?.id) {
      orgId = data.id;
      slug = data.slug;
      break;
    }
    if (error && /duplicate key|unique/i.test(error.message)) {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      continue;
    }
    log.error("organizations.create_additional_failed", { err: error?.message });
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "slug_unavailable" }, { status: 409 });
  }

  const { error: memberErr } = await service
    .from("organization_memberships")
    .insert({
      organization_id: orgId,
      profile_id: user.id,
      role: "user",
      is_admin: true,
    });
  if (memberErr) {
    log.error("organizations.create_additional_member_failed", {
      orgId,
      err: memberErr.message,
    });
    return NextResponse.json({ error: "member_insert_failed" }, { status: 500 });
  }

  log.info("organizations.created_additional", { orgId, slug, kind, userId: user.id });

  /* Switch straight into the new org so the next page load lands there. */
  const res = NextResponse.json({ id: orgId, slug, name, kind }, { status: 201 });
  res.cookies.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}
