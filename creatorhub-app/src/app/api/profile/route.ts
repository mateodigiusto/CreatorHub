/**
 * GET the authed user's profile, or null if they haven't completed
 * onboarding. Used by the AppStateProvider bootstrap so the Sidebar /
 * Dashboard / Sequence Studio see the same identity across devices.
 *
 * Returns the onboarding Profile shape (camelCase, nested audience) so
 * existing personalization helpers work unchanged.
 */

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/onboarding/types";

type ProfileRow = {
  display_name: string | null;
  handle: string | null;
  creator_type: string;
  niche: string;
  primary_goal: string;
  secondary_goals: string[];
  platforms: string[];
  content_formats: string[];
  frequency: string | null;
  planning_workflow: string[];
  biggest_problem: string | null;
  audience_who: string | null;
  audience_wants: string | null;
  audience_problem: string | null;
  selling: string[];
  offer_name: string | null;
  cta_style: string | null;
  custom_cta: string | null;
  brand_tones: string[];
  sequence_uses: string[];
  wants_niche_presets: boolean;
  asset_types: string[];
  reports_needs: string[];
  team: string | null;
  start_mode: string;
  schema_version: number;
  completed_at: string | null;
  trial_plan: string | null;
  trial_cycle: string | null;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  email_notifications: boolean;
};

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }

  const { data: row } = await supabase
    .from("profiles")
    .select(
      "display_name, handle, creator_type, niche, primary_goal, secondary_goals, " +
        "platforms, content_formats, frequency, planning_workflow, biggest_problem, " +
        "audience_who, audience_wants, audience_problem, selling, offer_name, " +
        "cta_style, custom_cta, brand_tones, sequence_uses, wants_niche_presets, " +
        "asset_types, reports_needs, team, start_mode, schema_version, completed_at, " +
        "trial_plan, trial_cycle, trial_started_at, trial_expires_at, email_notifications",
    )
    .eq("user_id", userRes.user.id)
    .returns<ProfileRow[]>()
    .maybeSingle();

  /* Onboarding v2 gate: only return a profile to the app if the row has
     completed_at AND schema_version === 2. v1 rows (legacy) get `null` here
     so the AppStateProvider treats them as un-onboarded → routed to /onboarding. */
  if (!row || !row.completed_at || row.schema_version !== 2) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }

  const profile: Profile = {
    version: 2,
    completedAt: row.completed_at,
    displayName: row.display_name ?? undefined,
    handle: row.handle ?? undefined,
    creatorType: row.creator_type as Profile["creatorType"],
    niche: row.niche,
    primaryGoal: row.primary_goal as Profile["primaryGoal"],
    secondaryGoals: row.secondary_goals as Profile["secondaryGoals"],
    platforms: row.platforms as Profile["platforms"],
    contentFormats: row.content_formats as Profile["contentFormats"],
    frequency: (row.frequency ?? "1-3") as Profile["frequency"],
    planningWorkflow: row.planning_workflow as Profile["planningWorkflow"],
    biggestProblem: (row.biggest_problem ?? "what-to-post") as Profile["biggestProblem"],
    audience: {
      who: row.audience_who ?? "",
      wants: row.audience_wants ?? "",
      problem: row.audience_problem ?? "",
    },
    selling: row.selling as Profile["selling"],
    offerName: row.offer_name ?? undefined,
    ctaStyle: (row.cta_style ?? "dm-keyword") as Profile["ctaStyle"],
    customCta: row.custom_cta ?? undefined,
    brandTones: row.brand_tones as Profile["brandTones"],
    sequenceUses: row.sequence_uses as Profile["sequenceUses"],
    wantsNichePresets: row.wants_niche_presets,
    assetTypes: row.asset_types as Profile["assetTypes"],
    reportsNeeds: row.reports_needs as Profile["reportsNeeds"],
    team: (row.team ?? "solo") as Profile["team"],
    startMode: row.start_mode as Profile["startMode"],
    trial:
      row.trial_plan && row.trial_cycle && row.trial_started_at && row.trial_expires_at
        ? {
            plan: row.trial_plan as "standard" | "pro",
            cycle: row.trial_cycle as "monthly" | "annual",
            startedAt: row.trial_started_at,
            expiresAt: row.trial_expires_at,
          }
        : undefined,
    emailNotifications: row.email_notifications,
  };

  return NextResponse.json({ profile });
}
