/**
 * PATCH /api/profile/update
 *
 * Partial profile update for fields the user can edit from Settings.
 * Currently: display_name + handle. Larger profile changes (creator type,
 * niche, goals) re-run onboarding via the Restart Setup flow.
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { withAudit } from "@/lib/audit";
import { schema } from "@/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type PatchBody = {
  displayName?: string | null;
  handle?: string | null;
  emailNotifications?: boolean;
};

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

  /* Validate + normalize. Empty string → null (clear). */
  const patch: Record<string, string | null | boolean> = {};
  if (body.displayName !== undefined) {
    const trimmed = (body.displayName ?? "").trim();
    patch.displayName = trimmed.length === 0 ? null : trimmed.slice(0, 80);
  }
  if (body.handle !== undefined) {
    const trimmed = (body.handle ?? "").trim().replace(/^@+/, "");
    if (trimmed && !/^[A-Za-z0-9._-]{1,30}$/.test(trimmed)) {
      return NextResponse.json({ error: "invalid_handle" }, { status: 400 });
    }
    patch.handle = trimmed.length === 0 ? null : trimmed;
  }
  if (body.emailNotifications !== undefined) {
    patch.emailNotifications = Boolean(body.emailNotifications);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "profile.updated",
        targetType: "profile",
        targetId: userId,
        metadata: { fields: Object.keys(patch) },
      },
      async (tx) => {
        await tx
          .update(schema.profiles)
          .set(patch)
          .where(eq(schema.profiles.userId, userId));
      },
    );
  } catch (err) {
    log.error("profile.update.failed", err);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, patch });
}
