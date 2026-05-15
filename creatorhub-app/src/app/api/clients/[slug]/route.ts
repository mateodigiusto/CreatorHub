/**
 * GET    /api/clients/[slug] — read the client row.
 * PATCH  /api/clients/[slug] — update display_name / slug / tagline / handle / status.
 * DELETE /api/clients/[slug] — hard delete (admin only). Cascades to all related tables.
 *
 * RLS handles tenant isolation. The DELETE policy on `clients` is admin-only
 * (is_org_admin), so non-admins get a 404-equivalent from RLS.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireClientAccess } from "@/lib/auth/require-client-access";
import { requireOrgAdmin } from "@/lib/auth/require-org-role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import type { Client, ClientStatus } from "@/lib/agency/types";

type Params = { params: Promise<{ slug: string }> };

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const STATUSES: ClientStatus[] = ["active", "paused", "archived"];

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { client } = await requireClientAccess(slug);
  return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { client } = await requireClientAccess(slug);

  const body = (await req.json().catch(() => null)) as {
    displayName?: string;
    slug?: string;
    tagline?: string | null;
    instagramHandle?: string | null;
    status?: ClientStatus;
  } | null;
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.displayName === "string") {
    const v = body.displayName.trim();
    if (!v || v.length > 120) return NextResponse.json({ error: "invalid_displayName" }, { status: 400 });
    patch.display_name = v;
  }
  if (typeof body.slug === "string") {
    const v = body.slug.trim();
    if (!SLUG_RE.test(v) || v.length > 60) return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
    patch.slug = v;
  }
  if (body.tagline !== undefined) patch.tagline = body.tagline ?? null;
  if (body.instagramHandle !== undefined) patch.instagram_handle = body.instagramHandle ?? null;
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    patch.status = body.status;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ client });
  }

  const supabase = await getSupabaseServer();
  const result = await supabase
    .from("clients")
    .update(patch as never)
    .eq("id", client.id)
    .select(
      "id, organization_id, slug, display_name, tagline, status, instagram_handle, created_by, created_at, updated_at",
    )
    .single();
  if (result.error) {
    if (/duplicate key|unique/i.test(result.error.message)) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
    log.error("clients.update_failed", { slug, err: result.error.message });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  const data = result.data as unknown as {
    id: string;
    organization_id: string;
    slug: string;
    display_name: string;
    tagline: string | null;
    status: ClientStatus;
    instagram_handle: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };

  const updated: Client = {
    id: data.id,
    organizationId: data.organization_id,
    slug: data.slug,
    displayName: data.display_name,
    tagline: data.tagline,
    status: data.status,
    instagramHandle: data.instagram_handle,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
  return NextResponse.json({ client: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  await requireOrgAdmin();
  const { client } = await requireClientAccess(slug);
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("clients").delete().eq("id", client.id);
  if (error) {
    log.error("clients.delete_failed", { slug, err: error.message });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
