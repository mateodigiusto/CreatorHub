/**
 * POST /api/scripts/[id]/approve
 *
 * Approval flow side effects:
 *   1. Set script status = 'approved' + approvedAt = now
 *   2. Insert a draft `sequences` row with linked_script via title prefix
 *      so it shows up on the Calendar tagged "Script Ready"
 *   3. Update generated_scripts.linked_sequence_id to point at the new row
 *
 * This is the integration point between the Script Generator and the
 * existing Content Calendar / Pipeline. Approving a script is what makes
 * it appear in the user's planning surface.
 *
 * Body (optional):
 *   { scheduledAt?: ISO string — pin to a specific calendar slot }
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { withAudit } from "@/lib/audit";
import { schema } from "@/db";
import {
  getSupabaseServer,
} from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";

type RouteContext = { params: Promise<{ id: string }> };

type Body = {
  scheduledAt?: string | null;
};

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const relationshipId = req.nextUrl.searchParams.get("relationship_id");
  const eff = await resolveEffectiveUser(supabase, userRes.user.id, relationshipId);
  if (!eff.ok) {
    return NextResponse.json({ error: eff.error }, { status: eff.status });
  }
  /* The script + the calendar-visible sequence both belong to the
     effective user (the editor when own-mode, the client when acting-as). */
  const userId = eff.userId;

  /* Optional schedule time. Validate it's a real ISO if present. */
  let scheduledAt: Date | null = null;
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    if (body.scheduledAt) {
      const d = new Date(body.scheduledAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "invalid_scheduled_at" }, { status: 400 });
      }
      scheduledAt = d;
    }
  } catch {
    /* Body is optional; ignore. */
  }

  /* Load script + verify ownership before any writes. Cast bridges
     supabase-js typed-builder narrowing that occasionally collapses to
     `never` on chained queries — we know the table shape via schema.ts. */
  type ScriptRow = {
    id: string;
    status: "draft" | "approved" | "used" | "archived";
    title: string | null;
    format: string;
    hook: string | null;
  };
  const reader = readerFor(supabase, eff.isClient);
  const scriptRes = await reader
    .from("generated_scripts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const script = scriptRes.data as ScriptRow | null;

  if (!script) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (script.status === "approved" || script.status === "used") {
    return NextResponse.json(
      { error: "already_approved", script },
      { status: 409 },
    );
  }

  let sequenceId: string | null = null;
  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "script.approved",
        targetType: "generated_script",
        targetId: id,
        metadata: { scheduledAt: scheduledAt?.toISOString() ?? null },
      },
      async (tx) => {
        /* Approve the script. */
        await tx
          .update(schema.generatedScripts)
          .set({ status: "approved", approvedAt: new Date() })
          .where(
            and(
              eq(schema.generatedScripts.id, id),
              eq(schema.generatedScripts.userId, userId),
            ),
          );

        /* Create a Calendar-visible sequence draft. The brief surface area
           is small here — the script's full text is on the script detail
           page, not duplicated. The sequence is essentially a "calendar
           handle" pointing back at the script. */
        const seqRows = await tx
          .insert(schema.sequences)
          .values({
            userId,
            title: script.title ?? "Script ready",
            goal: script.format,
            brief: script.hook ?? "",
            status: scheduledAt ? "scheduled" : "draft",
            scheduledAt: scheduledAt,
          })
          .returning({ id: schema.sequences.id });
        sequenceId = seqRows[0].id;

        /* Back-link from script → sequence so the script detail page can
           link to its calendar slot. */
        await tx
          .update(schema.generatedScripts)
          .set({ linkedSequenceId: sequenceId })
          .where(eq(schema.generatedScripts.id, id));
      },
    );
  } catch (err) {
    log.error("scripts.approve.failed", err);
    return NextResponse.json({ error: "approve_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sequenceId });
}
