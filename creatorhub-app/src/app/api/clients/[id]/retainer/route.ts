/**
 * PATCH /api/clients/[id]/retainer
 *
 * Manager-only. Updates the retainer fields on a creator_relationships row
 * (amount + currency + cadence). All three are nullable so passing
 * `{ retainerAmount: null }` clears the retainer.
 *
 * Body:
 *   {
 *     retainerAmount?: number | null     // > 0 if set
 *     retainerCurrency?: string | null   // ISO-4217 3-letter, uppercased
 *     retainerCadence?: 'monthly' | 'quarterly' | 'project' | null
 *   }
 *
 * Setting retainerAmount to a positive number requires currency + cadence
 * (so we never end up with "$50 of nothing"). Clearing one clears all three.
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { withAudit } from "@/lib/audit";
import { schema } from "@/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_CADENCES = new Set(["monthly", "quarterly", "project"] as const);

type Cadence = "monthly" | "quarterly" | "project";

type Body = {
  retainerAmount?: number | null;
  retainerCurrency?: string | null;
  retainerCadence?: Cadence | null;
};

type RelRow = {
  id: string;
  manager_id: string;
};

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const editorId = userRes.user.id;

  const { data: relData } = await supabase
    .from("creator_relationships")
    .select("id, manager_id")
    .eq("id", id)
    .maybeSingle();
  const rel = (relData ?? null) as RelRow | null;
  if (!rel) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (rel.manager_id !== editorId) {
    return NextResponse.json({ error: "manager_only" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  /* Normalize: explicit null on amount clears the whole retainer. */
  if (body.retainerAmount === null) {
    try {
      await withAudit(
        editorId,
        {
          actor: "user",
          action: "client.retainer_cleared",
          targetType: "creator_relationship",
          targetId: id,
        },
        async (tx) => {
          await tx
            .update(schema.creatorRelationships)
            .set({
              retainerAmount: null,
              retainerCurrency: null,
              retainerCadence: null,
            })
            .where(eq(schema.creatorRelationships.id, id));
        },
      );
    } catch (err) {
      log.error("clients.retainer.clear_failed", err);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, cleared: true });
  }

  /* Setting a retainer requires all three fields together. */
  const amount = body.retainerAmount;
  const currency = body.retainerCurrency?.trim().toUpperCase() ?? null;
  const cadence = body.retainerCadence ?? null;

  if (amount === undefined || amount === null) {
    return NextResponse.json({ error: "missing_amount" }, { status: 400 });
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }
  if (amount > 99_999_999) {
    return NextResponse.json({ error: "amount_too_large" }, { status: 400 });
  }
  if (!currency || currency.length !== 3 || !/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "invalid_currency" }, { status: 400 });
  }
  if (!cadence || !VALID_CADENCES.has(cadence)) {
    return NextResponse.json({ error: "invalid_cadence" }, { status: 400 });
  }

  try {
    await withAudit(
      editorId,
      {
        actor: "user",
        action: "client.retainer_set",
        targetType: "creator_relationship",
        targetId: id,
        metadata: { amount, currency, cadence },
      },
      async (tx) => {
        await tx
          .update(schema.creatorRelationships)
          .set({
            retainerAmount: amount.toFixed(2),
            retainerCurrency: currency,
            retainerCadence: cadence,
          })
          .where(eq(schema.creatorRelationships.id, id));
      },
    );
  } catch (err) {
    log.error("clients.retainer.set_failed", err);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    retainer: { amount, currency, cadence },
  });
}
