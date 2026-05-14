/**
 * `requireWorkspaceAccess()` — resolves the single client this logged-in
 * user can access via `client_memberships`, for the `/workspace/*` portal.
 *
 * Behaviour:
 *   - No session                              → redirect to /login
 *   - Zero client_memberships                 → 404 (notFound)
 *   - Exactly one client_membership           → return it
 *   - Multiple client_memberships             → redirect to /workspace/pick
 *                                               unless `slug` arg is given
 *                                               and matches one of them
 *
 * The "current" client for a multi-client viewer is kept in a cookie
 * (`creatorhub-workspace-slug`) so the layout doesn't have to thread it
 * through query params. `/workspace/pick` sets it; everything else reads it.
 *
 * RLS already isolates rows to client_memberships.profile_id =
 * auth.uid(), so reading via the Supabase server client is safe.
 */

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Client, ClientAccessRole, ClientStatus } from "@/lib/agency/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export const WORKSPACE_COOKIE = "creatorhub-workspace-slug";

export type WorkspaceViewer = {
  userId: string;
  email: string | null;
  client: Client;
  accessRole: ClientAccessRole;
};

type MembershipStatus = "pending" | "active" | "denied";

type RawMembership = {
  id: string;
  client_id: string;
  access_role: ClientAccessRole;
  status: MembershipStatus;
  clients: {
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
  } | null;
};

function rowToClient(row: NonNullable<RawMembership["clients"]>): Client {
  return {
    id: row.id,
    organizationId: row.organization_id,
    slug: row.slug,
    displayName: row.display_name,
    tagline: row.tagline,
    status: row.status,
    instagramHandle: row.instagram_handle,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Resolve the workspace viewer. Pass an explicit `slug` to lock to a
 * specific client (used by `/workspace/pick` after the user chose one).
 */
export async function requireWorkspaceAccess(
  slug?: string,
): Promise<WorkspaceViewer> {
  const supabase = await getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/workspace/overview");

  const { data: rows, error } = await supabase
    .from("client_memberships")
    .select(
      `id,
       client_id,
       access_role,
       status,
       clients (
         id,
         organization_id,
         slug,
         display_name,
         tagline,
         status,
         instagram_handle,
         created_by,
         created_at,
         updated_at
       )`,
    )
    .eq("profile_id", auth.user.id);

  if (error) notFound();

  const memberships = (rows ?? []) as unknown as RawMembership[];
  const withClient = memberships.filter((m) => m.clients !== null);
  const accessible = withClient.filter((m) => m.status === "active");

  if (accessible.length === 0) {
    /* They hold a membership but it isn't active yet — send them to the
       waiting screen rather than 404-ing them out of the app. */
    if (withClient.some((m) => m.status === "pending")) redirect("/pending");
    notFound();
  }

  const cookieStore = await cookies();
  const cookieSlug = cookieStore.get(WORKSPACE_COOKIE)?.value;

  const pickSlug = slug ?? cookieSlug ?? null;

  let chosen = accessible[0];
  if (pickSlug) {
    const match = accessible.find((m) => m.clients?.slug === pickSlug);
    if (match) chosen = match;
    else if (accessible.length > 1) redirect("/workspace/pick");
  } else if (accessible.length > 1) {
    redirect("/workspace/pick");
  }

  const clientRow = chosen.clients!;
  return {
    userId: auth.user.id,
    email: auth.user.email ?? null,
    client: rowToClient(clientRow),
    accessRole: chosen.access_role,
  };
}

/**
 * Read-only listing of all clients this user is a member of. Used by
 * `/workspace/pick` to render the chooser.
 */
export async function listWorkspaceClients(): Promise<
  Array<{ client: Client; accessRole: ClientAccessRole }>
> {
  const supabase = await getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/workspace/overview");

  const { data: rows } = await supabase
    .from("client_memberships")
    .select(
      `id,
       access_role,
       status,
       clients (
         id,
         organization_id,
         slug,
         display_name,
         tagline,
         status,
         instagram_handle,
         created_by,
         created_at,
         updated_at
       )`,
    )
    .eq("profile_id", auth.user.id);

  const memberships = (rows ?? []) as unknown as RawMembership[];
  return memberships
    .filter((m) => m.clients !== null && m.status === "active")
    .map((m) => ({
      client: rowToClient(m.clients!),
      accessRole: m.access_role,
    }));
}
