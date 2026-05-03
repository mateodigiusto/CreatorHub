import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Root gate. Server-side decides where to go based on real session +
 * profile state, so a fresh browser landing on `/` after signing in on
 * another device is routed correctly without depending on localStorage.
 *
 *   anonymous            → /login
 *   authed, no profile   → /onboarding
 *   authed, completed    → /dashboard
 */
export default async function Home() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("completed_at, schema_version")
    .eq("user_id", user.id)
    .returns<Array<{ completed_at: string | null; schema_version: number }>>()
    .maybeSingle();

  /* Onboarding v2 gate: schema_version === 2 + completed_at. v1 rows are
     legacy and get routed back through /onboarding. */
  const onboarded = profile?.completed_at && profile.schema_version === 2;
  redirect(onboarded ? "/dashboard" : "/onboarding");
}
