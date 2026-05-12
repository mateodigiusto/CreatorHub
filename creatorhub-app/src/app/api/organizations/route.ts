/**
 * POST /api/organizations — create the founding organization for a user.
 *
 * Called by the /onboarding/create-org page (and the future signup flow).
 * The caller must be authenticated; if they already have a membership, we
 * 409 instead of silently creating a second org (multi-org-per-user is
 * Phase 9, deferred).
 *
 * Trial path: new orgs land on `plan='pro'`, `subscription_status='trialing'`,
 * `trial_ends_at = now() + 14 days`. A daily cron (Phase 6 follow-up)
 * downgrades expired trials to `free`. The first membership row is
 * `role='user'`, `is_admin=true` — the founding admin per the WhatsApp-style
 * admin-flag model (see docs/plans/agency-clients-module.md §0).
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
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
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  const service = getSupabaseServiceRole();

  // Reject if user already has a membership — multi-org-per-user is Phase 9.
  const existing = await service
    .from("organization_memberships")
    .select("id")
    .eq("profile_id", user.id)
    .limit(1);
  if (existing.data && existing.data.length > 0) {
    return NextResponse.json({ error: "already_has_org" }, { status: 409 });
  }

  // Try a unique slug derived from the name; suffix with random chars on collision.
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
    log.error("organizations.create_failed", { err: error?.message });
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
    log.error("organizations.member_insert_failed", { orgId, err: memberErr.message });
    return NextResponse.json({ error: "member_insert_failed" }, { status: 500 });
  }

  log.info("organizations.created", { orgId, slug, userId: user.id });
  return NextResponse.json({ id: orgId, slug, name }, { status: 201 });
}
