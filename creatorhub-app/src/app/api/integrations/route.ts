/**
 * GET /api/integrations — return the current user's active platform
 * connections. Used by the Topbar connection pill to render real state
 * instead of the demo placeholder, and by the /integrations page to show
 * what's connected.
 *
 * Returns the redacted shape only (no token bytes). RLS scopes to the
 * caller's rows.
 */

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

type IntegrationRow = {
  id: string;
  platform: string;
  status: string;
  external_account_id: string;
  account_type: string | null;
  connected_at: string;
  last_synced_at: string | null;
};

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ activeCount: 0, integrations: [] });
  }

  const { data: rows } = await supabase
    .from("integrations")
    .select(
      "id, platform, status, external_account_id, account_type, connected_at, last_synced_at",
    )
    .eq("status", "active")
    .order("connected_at", { ascending: false })
    .returns<IntegrationRow[]>();

  const integrations = rows ?? [];
  return NextResponse.json({
    activeCount: integrations.length,
    integrations,
  });
}
