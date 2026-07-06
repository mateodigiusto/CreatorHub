/**
 * Gates for routes that require an organization membership.
 *
 *   const session = await requireOrg();      // any org (agency OR solo)
 *   const session = await requireAgency();   // org with kind='agency' only
 *
 * `requireOrg` — unauthenticated → /login; authed but no org membership →
 * /onboarding/create-org. Used by surfaces both agency staff and solo
 * accounts can see (e.g. billing).
 *
 * `requireAgency` — same, plus: a solo account (kind='solo') is bounced to
 * /dashboard. Used by the client-management surface (`/clients/**`,
 * `/api/clients/**`) which a solo account has no business seeing.
 */

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSession, type AgencySession } from "./session";

export async function requireOrg(): Promise<AgencySession> {
  const session = await getSession();
  if (session) return session;

  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  redirect("/onboarding/create-org");
}

export async function requireAgency(): Promise<AgencySession> {
  const session = await requireOrg();
  if (session.organization.kind === "solo") redirect("/dashboard");
  return session;
}
