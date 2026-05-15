/**
 * POST /api/clients/[slug]/preview
 *
 * "View as client" entry for agency directors. Sets the preview cookie
 * (slug of the client being previewed) + the standard workspace slug
 * cookie, then 303s into `/workspace/overview`. The director's org-staff
 * session is the authority — no `client_memberships` row is created.
 *
 * Requires:
 *   - active session
 *   - agency org membership
 *   - director role (`canPreviewAsClient`)
 *   - the slug must belong to that director's org
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canPreviewAsClient } from "@/lib/agency/permissions";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  WORKSPACE_COOKIE,
  WORKSPACE_PREVIEW_COOKIE,
} from "@/lib/auth/require-workspace-access";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!canPreviewAsClient(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await getSupabaseServer();
  const { data: clientRow, error } = await supabase
    .from("clients")
    .select("id, slug")
    .eq("organization_id", session.organization.id)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !clientRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(
    new URL("/workspace/overview", origin),
    303,
  );
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  };
  res.cookies.set(WORKSPACE_PREVIEW_COOKIE, slug, cookieOpts);
  res.cookies.set(WORKSPACE_COOKIE, slug, cookieOpts);
  return res;
}
