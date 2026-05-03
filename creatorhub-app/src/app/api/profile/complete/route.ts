/**
 * Onboarding completion endpoint.
 *
 * The onboarding wizard POSTs the user's answers here on the final step.
 * We upsert into profiles with completed_at set, and emit an audit event in
 * the same transaction.
 *
 * Authoritative source for "has this user finished onboarding?" — the
 * `/api/auth/callback` gate reads `profiles.completed_at` and routes to
 * `/dashboard` only when it's non-null.
 */

import { NextResponse, type NextRequest } from "next/server";
import { withAudit } from "@/lib/audit";
import { profiles } from "@/db/schema";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import type { Profile } from "@/lib/onboarding/types";

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  let body: Profile;
  try {
    body = (await req.json()) as Profile;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  /* Minimal shape check — we trust the client to have walked the wizard,
     but reject obvious garbage so a bad body can't silently corrupt the row. */
  if (
    body?.version !== 2 ||
    typeof body.creatorType !== "string" ||
    typeof body.niche !== "string"
  ) {
    return NextResponse.json({ error: "invalid_profile" }, { status: 400 });
  }

  const row = {
    userId,
    displayName: body.displayName ?? null,
    handle: body.handle ?? null,
    creatorType: body.creatorType,
    niche: body.niche,
    primaryGoal: body.primaryGoal,
    secondaryGoals: body.secondaryGoals ?? [],
    platforms: body.platforms ?? [],
    contentFormats: body.contentFormats ?? [],
    frequency: body.frequency ?? null,
    planningWorkflow: body.planningWorkflow ?? [],
    biggestProblem: body.biggestProblem ?? null,
    audienceWho: body.audience?.who ?? null,
    audienceWants: body.audience?.wants ?? null,
    audienceProblem: body.audience?.problem ?? null,
    selling: body.selling ?? [],
    offerName: body.offerName ?? null,
    ctaStyle: body.ctaStyle ?? null,
    customCta: body.customCta ?? null,
    brandTones: body.brandTones ?? [],
    sequenceUses: body.sequenceUses ?? [],
    wantsNichePresets: body.wantsNichePresets ?? true,
    assetTypes: body.assetTypes ?? [],
    reportsNeeds: body.reportsNeeds ?? [],
    team: body.team ?? null,
    startMode: body.startMode,
    schemaVersion: 2,
    completedAt: new Date(),
    trialPlan: body.trial?.plan ?? null,
    trialCycle: body.trial?.cycle ?? null,
    trialStartedAt: body.trial?.startedAt ? new Date(body.trial.startedAt) : null,
    trialExpiresAt: body.trial?.expiresAt ? new Date(body.trial.expiresAt) : null,
  };

  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "profile.completed",
        targetType: "profile",
        targetId: userId,
        metadata: {
          creator_type: row.creatorType,
          trial_plan: row.trialPlan,
          trial_cycle: row.trialCycle,
        },
      },
      async (tx) => {
        await tx
          .insert(profiles)
          .values(row)
          .onConflictDoUpdate({
            target: profiles.userId,
            set: { ...row, updatedAt: new Date() },
          });
      },
    );
  } catch (err) {
    log.error("profile.complete.write_failed", err);
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
