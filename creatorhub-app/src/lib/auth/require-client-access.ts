/**
 * `requireClientAccess(slug)` — resolves a client by slug within the
 * caller's current organization, redirecting if anything is off.
 *
 * Used by all `/clients/[slug]/...` server components and API route
 * handlers that need to load the client row before doing anything else.
 *
 * RLS already isolates rows to the caller's session, so a notFound() on
 * miss is correct: the row either doesn't exist or the caller can't see it.
 */

import { notFound } from "next/navigation";
import type { Client, ClientStatus } from "@/lib/agency/types";
import { requireOrg } from "@/lib/agency/_phase1_deps";
import type { AgencySession } from "@/lib/agency/_phase1_deps";
import { getSupabaseServer } from "@/lib/supabase/server";

export type RequireClientAccessResult = {
  session: AgencySession;
  client: Client;
};

export async function requireClientAccess(slug: string): Promise<RequireClientAccessResult> {
  const session = await requireOrg();
  const supabase = await getSupabaseServer();

  type Row = {
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
  const res = await supabase
    .from("clients")
    .select(
      "id, organization_id, slug, display_name, tagline, status, instagram_handle, created_by, created_at, updated_at",
    )
    .eq("organization_id", session.organization.id)
    .eq("slug", slug)
    .maybeSingle();

  if (res.error || !res.data) notFound();
  const data = res.data as unknown as Row;

  const client: Client = {
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

  return { session, client };
}
