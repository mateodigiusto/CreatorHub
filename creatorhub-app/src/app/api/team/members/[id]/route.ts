/**
 * PATCH  /api/team/members/[id] — change a teammate's role / admin flag.
 * DELETE /api/team/members/[id] — remove a teammate from the agency.
 *
 * `[id]` is an `organization_memberships` row id. Org-admin only. The
 * `enforce_org_has_admin` trigger blocks demoting / removing the last
 * admin — we surface that as a friendly 409.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireAgency } from "@/lib/auth/require-org";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type Params = { params: Promise<{ id: string }> };
type OrgRole = "user" | "editor" | "director";
const ROLES: OrgRole[] = ["user", "editor", "director"];

const LAST_ADMIN_RE = /last admin/i;

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireAgency();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "admin_required" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    role?: OrgRole;
    isAdmin?: boolean;
  } | null;
  const patch: Record<string, unknown> = {};
  if (body?.role !== undefined) {
    if (!ROLES.includes(body.role)) {
      return NextResponse.json({ error: "invalid_role" }, { status: 400 });
    }
    patch.role = body.role;
  }
  if (body?.isAdmin !== undefined) {
    if (typeof body.isAdmin !== "boolean") {
      return NextResponse.json({ error: "invalid_isAdmin" }, { status: 400 });
    }
    patch.is_admin = body.isAdmin;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const res = await supabase
    .from("organization_memberships")
    .update(patch as never)
    .eq("id", id)
    .eq("organization_id", session.organization.id);
  if (res.error) {
    if (LAST_ADMIN_RE.test(res.error.message)) {
      return NextResponse.json(
        { error: "last_admin", message: "Your agency needs at least one admin." },
        { status: 409 },
      );
    }
    log.error("team.member_update_failed", { id, err: res.error.message });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireAgency();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "admin_required" }, { status: 403 });
  }

  const supabase = await getSupabaseServer();
  const res = await supabase
    .from("organization_memberships")
    .delete()
    .eq("id", id)
    .eq("organization_id", session.organization.id);
  if (res.error) {
    if (LAST_ADMIN_RE.test(res.error.message)) {
      return NextResponse.json(
        { error: "last_admin", message: "Your agency needs at least one admin." },
        { status: 409 },
      );
    }
    log.error("team.member_remove_failed", { id, err: res.error.message });
    return NextResponse.json({ error: "remove_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
