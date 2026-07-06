/**
 * `resolveUserContext()` — the single resolver that classifies the current
 * user into one of the app's account tracks, and `destinationFor()` — the
 * matching landing route.
 *
 * Three account types, one login page:
 *   • agency-staff   — org membership, organizations.kind = 'agency'   → /clients
 *   • solo           — org membership, organizations.kind = 'solo'     → /dashboard
 *   • client-active  — active client_membership                       → /workspace
 *   • client-pending — pending client_membership (awaiting approval)   → /pending
 *   • needs-onboarding — authenticated, no membership anywhere         → /onboarding
 *   • anon           — not signed in                                  → /login
 *
 * Precedence: an org membership wins over a client membership (an agency
 * staffer who is also somebody's client still sees the agency surface).
 * Multi-account switching is a later concern.
 *
 * Memoized per request via React `cache()`.
 */

import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSession, type AgencySession } from "./session";

export type UserContext =
  | { type: "anon" }
  | { type: "needs-onboarding"; userId: string; email: string }
  | { type: "agency-staff"; session: AgencySession }
  | { type: "solo"; session: AgencySession }
  | {
      type: "client-active";
      userId: string;
      email: string;
      clientId: string;
      clientSlug: string;
    }
  | {
      type: "client-pending";
      userId: string;
      email: string;
      clientId: string;
      clientSlug: string;
      organizationName: string;
      clientDisplayName: string;
    };

type ClientMembershipRow = {
  status: "pending" | "active" | "denied";
  client: {
    id: string;
    slug: string;
    display_name: string;
    organization: { name: string } | null;
  } | null;
};

export const resolveUserContext = cache(async (): Promise<UserContext> => {
  /* Local UI-preview escape hatch. With PREVIEW_NO_AUTH=1 (.env.local only)
     there's no backend, so present a stub solo session — `/` routes to
     /dashboard and the app is browsable without signing in. */
  if (process.env.PREVIEW_NO_AUTH === "1") {
    return {
      type: "solo",
      session: {
        userId: "preview-user",
        email: "preview@creatorhub.local",
        organization: {
          id: "preview-org",
          slug: "preview",
          name: "Preview Workspace",
          kind: "solo",
        },
        orgRole: "director",
        isAdmin: true,
        plan: "pro",
        subscriptionStatus: "active",
      },
    };
  }

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { type: "anon" };

  /* Org membership wins. getSession() already resolves role + plan + kind. */
  const session = await getSession();
  if (session) {
    return session.organization.kind === "solo"
      ? { type: "solo", session }
      : { type: "agency-staff", session };
  }

  /* No org membership — check for a client membership. Prefer an active one;
     fall back to a pending one (awaiting agency approval). A lone denied
     membership is treated as "no membership" so the user isn't stuck. */
  const { data: rows } = await supabase
    .from("client_memberships")
    .select(
      "status, client:clients ( id, slug, display_name, organization:organizations ( name ) )",
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const memberships = (rows ?? []) as unknown as ClientMembershipRow[];
  const active = memberships.find((m) => m.status === "active" && m.client);
  if (active?.client) {
    return {
      type: "client-active",
      userId: user.id,
      email: user.email ?? "",
      clientId: active.client.id,
      clientSlug: active.client.slug,
    };
  }

  const pending = memberships.find((m) => m.status === "pending" && m.client);
  if (pending?.client) {
    return {
      type: "client-pending",
      userId: user.id,
      email: user.email ?? "",
      clientId: pending.client.id,
      clientSlug: pending.client.slug,
      organizationName: pending.client.organization?.name ?? "the agency",
      clientDisplayName: pending.client.display_name,
    };
  }

  return { type: "needs-onboarding", userId: user.id, email: user.email ?? "" };
});

/** The route a given context should land on. */
export function destinationFor(ctx: UserContext): string {
  switch (ctx.type) {
    case "anon":
      return "/login";
    case "needs-onboarding":
      return "/onboarding";
    case "agency-staff":
      return "/clients";
    case "solo":
      return "/dashboard";
    case "client-active":
      return "/workspace";
    case "client-pending":
      return "/pending";
  }
}
