/**
 * POST /api/clients — create a creator client inside the caller's org.
 * GET  /api/clients — list the org's clients (sorted by display_name).
 *
 * Plan limits gate creation via assertPlanAllows("add_client") which
 * checks countActiveClients vs PLANS[org.plan].maxClients. Returns 402
 * with a typed message when at the cap so the UI can surface the upgrade
 * CTA.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/require-org";
import { assertPlanAllows, clientQuota, PlanLimitError } from "@/lib/billing/limits";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import type { Client, ClientStatus } from "@/lib/agency/types";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function rowToClient(r: {
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
}): Client {
  return {
    id: r.id,
    organizationId: r.organization_id,
    slug: r.slug,
    displayName: r.display_name,
    tagline: r.tagline,
    status: r.status,
    instagramHandle: r.instagram_handle,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function GET() {
  const session = await requireOrg();
  const supabase = await getSupabaseServer();
  const result = await supabase
    .from("clients")
    .select(
      "id, organization_id, slug, display_name, tagline, status, instagram_handle, created_by, created_at, updated_at",
    )
    .eq("organization_id", session.organization.id)
    .order("display_name", { ascending: true });
  if (result.error) {
    log.error("clients.list_failed", { err: result.error.message });
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
  const rows = (result.data ?? []) as unknown as Parameters<typeof rowToClient>[0][];
  const quota = await clientQuota(session.plan, session.organization.id);
  return NextResponse.json({
    clients: rows.map(rowToClient),
    quota,
  });
}

export async function POST(req: NextRequest) {
  const session = await requireOrg();
  const body = (await req.json().catch(() => null)) as {
    displayName?: string;
    slug?: string;
    tagline?: string | null;
    instagramHandle?: string | null;
  } | null;

  const displayName = body?.displayName?.trim() ?? "";
  const slug = body?.slug?.trim() ?? "";
  if (!displayName || displayName.length > 120) {
    return NextResponse.json({ error: "invalid_displayName" }, { status: 400 });
  }
  if (!SLUG_RE.test(slug) || slug.length > 60) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  try {
    await assertPlanAllows(session.plan, {
      kind: "add_client",
      organizationId: session.organization.id,
    });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json(
        { error: err.code, message: err.message, upgradeTo: err.upgradeTo },
        { status: 402 },
      );
    }
    throw err;
  }

  const supabase = await getSupabaseServer();
  const result = await supabase
    .from("clients")
    .insert({
      organization_id: session.organization.id,
      slug,
      display_name: displayName,
      tagline: body?.tagline ?? null,
      instagram_handle: body?.instagramHandle ?? null,
      created_by: session.userId,
    } as never)
    .select(
      "id, organization_id, slug, display_name, tagline, status, instagram_handle, created_by, created_at, updated_at",
    )
    .single();

  if (result.error) {
    if (/duplicate key|unique/i.test(result.error.message)) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
    log.error("clients.create_failed", { err: result.error.message });
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
  const data = result.data as unknown as Parameters<typeof rowToClient>[0];

  return NextResponse.json({ client: rowToClient(data) }, { status: 201 });
}
