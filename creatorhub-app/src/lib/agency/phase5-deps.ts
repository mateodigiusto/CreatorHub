/**
 * Phase 5 dependency shim.
 *
 * Phase 5 (assets + meetings + comments + Bunny.net Stream) was built in
 * parallel with Phases 2, 3, 4. Those phases own `lib/auth/session.ts`,
 * `lib/auth/require-client-access.ts`, `lib/billing/limits.ts`, etc. Until
 * they merge, Phase 5 imports the helpers it needs from THIS file.
 *
 * At cutover, every Phase 5 route handler that imports from
 * `@/lib/agency/phase5-deps` should be re-pointed at the real module and
 * this file deleted. See `docs/plans/agency-clients-phase5-NOTES.md`.
 *
 * Behaviour today:
 *   - getAgencySession() — best-effort, returns a placeholder session for
 *     any authenticated user. Real session resolver in Phase 1/2.
 *   - requireClientAccess(slug) — placeholder; real resolver in Phase 2.
 *   - requireOrgRole / requireOrgAdmin — basic gate.
 *   - assertPlanAllows — no-op (Phase 6 enforces).
 */

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export type BaseRole = "user" | "editor" | "director";
export type Plan = "free" | "starter" | "pro" | "scale";

export type AgencySession = {
  userId: string;
  email: string | null;
  organizationId: string;
  orgRole: BaseRole;
  isOrgAdmin: boolean;
  plan: Plan;
  subscriptionStatus:
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "incomplete"
    | "incomplete_expired"
    | "paused";
};

export type ResolvedClient = {
  id: string;
  slug: string;
  organizationId: string;
  displayName: string;
  /** True when the resolver matched via `client_memberships`, false when via org staff. */
  isClientViewer: boolean;
};

export type Capability = "addClient" | "aiAnalyzer" | "videoUpload";

export class HttpError extends Error {
  status: number;
  code: string;
  detail?: Record<string, unknown>;
  constructor(status: number, code: string, detail?: Record<string, unknown>) {
    super(code);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export function httpErrorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json(
      { error: err.code, ...(err.detail ?? {}) },
      { status: err.status },
    );
  }
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

/**
 * Resolve the caller's session. Best effort:
 *   - look up auth.user from Supabase server client (RLS-aware)
 *   - find first organization_membership row → orgId + role
 *   - read organizations row → plan + status
 *
 * Failures along the way return null instead of throwing so route handlers
 * can return 401 cleanly.
 */
export async function getAgencySession(): Promise<AgencySession | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  // Look up the caller's first org membership. If the orgs schema isn't
  // applied yet (0033 not migrated) this will throw — we degrade to a
  // placeholder so /assets and /meetings still render in dev.
  try {
    const { data: m } = await supabase
      .from("organization_memberships")
      .select("organization_id, role, is_admin")
      .eq("profile_id", data.user.id)
      .limit(1)
      .maybeSingle()
      .returns<{
        organization_id: string;
        role: BaseRole;
        is_admin: boolean;
      } | null>();

    if (!m) {
      return {
        userId: data.user.id,
        email: data.user.email ?? null,
        organizationId: "00000000-0000-0000-0000-000000000000",
        orgRole: "director",
        isOrgAdmin: true,
        plan: "pro",
        subscriptionStatus: "trialing",
      };
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("plan, subscription_status")
      .eq("id", m.organization_id)
      .maybeSingle()
      .returns<{
        plan: Plan;
        subscription_status: AgencySession["subscriptionStatus"];
      } | null>();

    return {
      userId: data.user.id,
      email: data.user.email ?? null,
      organizationId: m.organization_id,
      orgRole: m.role,
      isOrgAdmin: m.is_admin,
      plan: org?.plan ?? "pro",
      subscriptionStatus: org?.subscription_status ?? "trialing",
    };
  } catch {
    return {
      userId: data.user.id,
      email: data.user.email ?? null,
      organizationId: "00000000-0000-0000-0000-000000000000",
      orgRole: "director",
      isOrgAdmin: true,
      plan: "pro",
      subscriptionStatus: "trialing",
    };
  }
}

/**
 * Resolve a client by `(currentOrg.id, slug)`. Real implementation arrives
 * with Phase 2.
 *
 * Falls back to a slug-keyed placeholder when the `clients` table isn't
 * present yet — same degradation strategy as `getAgencySession`.
 */
export async function requireClientAccess(slug: string): Promise<ResolvedClient> {
  const session = await getAgencySession();
  if (!session) throw new HttpError(401, "unauthorized");
  const supabase = await getSupabaseServer();
  try {
    const { data: row } = await supabase
      .from("clients")
      .select("id, slug, organization_id, display_name")
      .eq("organization_id", session.organizationId)
      .eq("slug", slug)
      .maybeSingle()
      .returns<{
        id: string;
        slug: string;
        organization_id: string;
        display_name: string;
      } | null>();
    if (row) {
      return {
        id: row.id,
        slug: row.slug,
        organizationId: row.organization_id,
        displayName: row.display_name,
        isClientViewer: false,
      };
    }
  } catch {
    // table not present yet — fall through to placeholder
  }
  return {
    id: "00000000-0000-0000-0000-000000000000",
    slug,
    organizationId: session.organizationId,
    displayName: slug,
    isClientViewer: false,
  };
}

export function requireOrgRole(session: AgencySession, allowed: BaseRole[]): void {
  if (!allowed.includes(session.orgRole)) {
    throw new HttpError(403, "forbidden");
  }
}

export function requireOrgAdmin(session: AgencySession): void {
  if (!session.isOrgAdmin) {
    throw new HttpError(403, "admin_required");
  }
}

export function assertPlanAllows(
  _session: AgencySession,
  _capability: Capability,
): void {
  // Phase 6 enforces. Call sites are wired so enforcement is one flip.
}
