/**
 * `requireClientAccess(slug)` — resolves a client by slug for either an
 * agency-staff session OR an active client-side viewer.
 *
 * The agency `/clients/[slug]/...` admin pages call this from server
 * components (agency-staff path). The same `/api/clients/[slug]/...` API
 * routes are also hit by the `/workspace/*` client portal — those callers
 * are client-side viewers (no `organization_memberships` row, only a
 * `client_memberships` row). The route handlers shouldn't fork their
 * gating per-caller, so this resolver accepts both:
 *
 *   1. Caller has an org membership AND org.kind === 'agency' — resolve
 *      the client by `(org.id, slug)`.
 *   2. Caller has an *active* `client_memberships` row for a client whose
 *      `slug` matches — resolve via that membership.
 *
 * Either path returns the same `{session, client}` shape. For path (2) the
 * `session` is synthesised from the membership: enough fields for
 * downstream code to compile, but writes will be blocked by RLS (every
 * mutation policy on the workspace tables is `is_org_staff`-only — see
 * migration 0034/0035), so the synthetic session can't be used to escalate.
 *
 * RLS is the real security boundary. `notFound()` on miss is correct —
 * the row either doesn't exist or the caller can't see it.
 */

import { notFound, redirect } from "next/navigation";
import type { Client, ClientStatus } from "@/lib/agency/types";
import { getSession, type AgencySession } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";

export type RequireClientAccessResult = {
  session: AgencySession;
  client: Client;
};

type ClientRow = {
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

const CLIENT_COLS =
  "id, organization_id, slug, display_name, tagline, status, instagram_handle, created_by, created_at, updated_at";

function rowToClient(r: ClientRow): Client {
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

export async function requireClientAccess(
  slug: string,
): Promise<RequireClientAccessResult> {
  const supabase = await getSupabaseServer();

  /* Path 1 — agency staff. They see clients through their org. Solo orgs
     fall through to path 2; they have no clients but the path is correct. */
  const session = await getSession();
  if (session && session.organization.kind === "agency") {
    const res = await supabase
      .from("clients")
      .select(CLIENT_COLS)
      .eq("organization_id", session.organization.id)
      .eq("slug", slug)
      .maybeSingle();
    if (res.error || !res.data) notFound();
    return { session, client: rowToClient(res.data as unknown as ClientRow) };
  }

  /* Path 2 — client-side viewer. Resolve via an active `client_memberships`
     row for this slug. Joined to `clients!inner` so RLS lets us see the
     client row through the membership. */
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const memRes = await supabase
    .from("client_memberships")
    .select(`status, clients!inner ( ${CLIENT_COLS} )`)
    .eq("profile_id", authData.user.id)
    .eq("status", "active");

  type MembershipRow = {
    status: "pending" | "active" | "denied";
    clients: ClientRow | null;
  };
  const rows = (memRes.data ?? []) as unknown as MembershipRow[];
  const match = rows.find((r) => r.clients !== null && r.clients.slug === slug);
  if (!match || !match.clients) notFound();
  const client = rowToClient(match.clients);

  /* Synthesise a minimal session so callers can read session.organization.id
     / session.userId without branching. NOT a privilege grant — every
     workspace-table write policy is `is_org_staff`-only, so RLS rejects any
     mutation a client-side viewer attempts through this code path. */
  const syntheticSession: AgencySession = {
    userId: authData.user.id,
    email: authData.user.email ?? "",
    organization: {
      id: client.organizationId,
      slug: "",
      name: "",
      kind: "agency",
    },
    orgRole: "user",
    isAdmin: false,
    plan: "pro",
    subscriptionStatus: "active",
  };
  return { session: syntheticSession, client };
}
