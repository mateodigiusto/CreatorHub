/**
 * Gate for any route or page that requires an authenticated user with an
 * organization membership. Use at the top of admin pages and `/api/clients/**`
 * route handlers.
 *
 *   const session = await requireOrg();
 *   //   ^? AgencySession (never null)
 *
 * Unauthenticated → /login.
 * Authenticated but no org membership → /onboarding/create-org.
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
