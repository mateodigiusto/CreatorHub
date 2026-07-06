/**
 * PATCH /api/profile/role
 *
 * Soft re-onboarding entry point. Lets a user switch their creator_type
 * (Creator / Content Manager / Editor / Agency / etc.) without re-running
 * the full /onboarding wizard. Sidebar order, dashboard copy, and the
 * primary "Next move" action all flip immediately because they read from
 * profile state.
 *
 * Validates against the v28 CHECK constraint values — anything outside
 * the canonical set rejects with 400 before hitting the DB.
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { withAudit } from "@/lib/audit";
import { schema } from "@/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import type { CreatorType } from "@/lib/onboarding/types";

const VALID_ROLES = new Set<CreatorType>([
  "creator",
  "infoproduct",
  "agency",
  "fitness",
  "realestate",
  "content_manager",
  "editor",
  "other",
]);

type PatchBody = { creatorType?: string };

export async function PATCH(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const next = body.creatorType;
  if (!next || !VALID_ROLES.has(next as CreatorType)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "profile.role_changed",
        targetType: "profile",
        targetId: userId,
        metadata: { creatorType: next },
      },
      async (tx) => {
        await tx
          .update(schema.profiles)
          .set({ creatorType: next })
          .where(eq(schema.profiles.userId, userId));
      },
    );
  } catch (err) {
    log.error("profile.role.update_failed", err);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, creatorType: next });
}
