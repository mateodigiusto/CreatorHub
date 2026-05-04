/**
 * GET /api/clients/[id]/streak — current + longest streak (30-day window) +
 * the per-day grid for a heatmap. Computed live from the completion log.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/clients/streak";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: rel } = await supabase
    .from("creator_relationships")
    .select("creator_id")
    .eq("id", id)
    .returns<Array<{ creator_id: string | null }>>()
    .maybeSingle();
  if (!rel?.creator_id) {
    return NextResponse.json({
      current: 0,
      longest: 0,
      grid: [],
    });
  }

  const admin = getSupabaseServiceRole();
  const { data: profile } = await admin
    .from("profiles")
    .select("timezone")
    .eq("user_id", rel.creator_id)
    .returns<Array<{ timezone: string }>>()
    .maybeSingle();
  const tz = profile?.timezone ?? "UTC";

  const result = await computeStreak(supabase, id, tz);
  return NextResponse.json(result);
}
