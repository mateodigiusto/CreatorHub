/**
 * POST /api/workspace/pick
 *
 * Sets the `creatorhub-workspace-slug` cookie used by
 * `requireWorkspaceAccess` to resolve a specific client when the caller
 * has more than one `client_memberships` row. 303-redirects back to
 * `/workspace/overview`.
 *
 * Accepts either a JSON body or a form post (the pick page uses a plain
 * `<form method="POST">` so JavaScript-disabled browsers still work).
 *
 * Verifies the slug is one the caller actually has a membership for,
 * so this endpoint can't be abused to force-route someone into a client
 * they don't belong to.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "@/lib/auth/require-workspace-access";

export const dynamic = "force-dynamic";

async function readSlug(req: NextRequest): Promise<string | null> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as { slug?: string } | null;
    return body?.slug ?? null;
  }
  const form = await req.formData().catch(() => null);
  const raw = form?.get("slug");
  return typeof raw === "string" ? raw : null;
}

export async function POST(req: NextRequest) {
  const slug = await readSlug(req);
  if (!slug) {
    return NextResponse.json({ error: "missing_slug" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: rows } = await supabase
    .from("client_memberships")
    .select("clients(slug)")
    .eq("profile_id", auth.user.id);

  const owned = new Set(
    ((rows ?? []) as Array<{ clients: { slug: string } | null }>)
      .map((r) => r.clients?.slug)
      .filter((s): s is string => !!s),
  );

  if (!owned.has(slug)) {
    return NextResponse.json({ error: "not_a_member" }, { status: 403 });
  }

  const url = new URL(req.url);
  const res = NextResponse.redirect(
    new URL("/workspace/overview", url.origin),
    303,
  );
  res.cookies.set(WORKSPACE_COOKIE, slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
