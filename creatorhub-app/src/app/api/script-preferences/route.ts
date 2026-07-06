/**
 * GET / PATCH /api/script-preferences
 *
 * Per-user defaults for the AI Script Generator (v23 schema). GET is
 * lazy: if the user has no row yet, return the schema defaults without
 * inserting (insert happens on first PATCH or first /scripts visit).
 *
 * PATCH accepts a partial body. We re-derive the full row at the end so
 * the response always shows the user's effective preferences.
 */

import { NextResponse, type NextRequest } from "next/server";
import { withAudit } from "@/lib/audit";
import { schema } from "@/db";
import {
  getSupabaseServer,
} from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";
import type { Platform } from "@/lib/onboarding/types";

const VALID_FORMATS = new Set([
  "reel", "longform", "vsl", "story_sequence", "email",
] as const);
const VALID_FREQUENCIES = new Set([
  "daily", "three_x_week", "weekly", "biweekly", "monthly", "custom",
] as const);
const VALID_PLATFORMS = new Set<Platform>([
  "instagram", "tiktok", "youtube", "linkedin", "x", "facebook",
]);

type ScriptFormat = "reel" | "longform" | "vsl" | "story_sequence" | "email";
type ScriptFrequency =
  | "daily" | "three_x_week" | "weekly" | "biweekly" | "monthly" | "custom";

type PatchBody = {
  scriptsPerPeriod?: number;
  frequency?: ScriptFrequency;
  customCron?: string | null;
  defaultFormat?: ScriptFormat;
  defaultPlatforms?: Platform[];
  monthlyCap?: number | null;
  /* Free-form prompt overrides — caller-validated shape. */
  systemPromptOverrides?: Record<string, unknown>;
};

const DEFAULT_PREFS = {
  scriptsPerPeriod: 3,
  frequency: "weekly" as ScriptFrequency,
  customCron: null as string | null,
  defaultFormat: "reel" as ScriptFormat,
  defaultPlatforms: ["instagram"] as Platform[],
  monthlyCap: null as number | null,
  systemPromptOverrides: {} as Record<string, unknown>,
};

export async function GET(req: NextRequest) {
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
  const reader = readerFor(supabase, eff.isClient);

  const { data, error } = await reader
    .from("script_preferences")
    .select("*")
    .eq("user_id", eff.userId)
    .maybeSingle();

  if (error) {
    log.error("script_preferences.get.failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  return NextResponse.json({
    preferences: data ?? { user_id: eff.userId, ...toSnake(DEFAULT_PREFS) },
    isDefault: !data,
  });
}

export async function PATCH(req: NextRequest) {
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
  const userId = eff.userId;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const validation = validatePatch(body);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const patch = validation.patch;

  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "script_preferences.updated",
        targetType: "script_preferences",
        targetId: userId,
        metadata: { fields: Object.keys(patch) },
      },
      async (tx) => {
        /* Upsert: insert defaults + patch, or update existing row. */
        await tx
          .insert(schema.scriptPreferences)
          .values({ userId, ...DEFAULT_PREFS, ...patch })
          .onConflictDoUpdate({
            target: schema.scriptPreferences.userId,
            set: patch,
          });
      },
    );
  } catch (err) {
    log.error("script_preferences.patch.failed", err);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  /* Re-read so the client gets the canonical row. */
  const reader = readerFor(supabase, eff.isClient);
  const { data } = await reader
    .from("script_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  return NextResponse.json({ preferences: data });
}

function validatePatch(
  body: PatchBody,
): { patch: Record<string, unknown> } | { error: string } {
  const patch: Record<string, unknown> = {};

  if (body.scriptsPerPeriod !== undefined) {
    const n = Number(body.scriptsPerPeriod);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return { error: "invalid_scripts_per_period" };
    }
    patch.scriptsPerPeriod = n;
  }
  if (body.frequency !== undefined) {
    if (!VALID_FREQUENCIES.has(body.frequency)) return { error: "invalid_frequency" };
    patch.frequency = body.frequency;
  }
  if (body.customCron !== undefined) {
    const v = body.customCron === null ? null : String(body.customCron).trim();
    patch.customCron = v && v.length > 0 ? v : null;
  }
  if (body.defaultFormat !== undefined) {
    if (!VALID_FORMATS.has(body.defaultFormat)) return { error: "invalid_format" };
    patch.defaultFormat = body.defaultFormat;
  }
  if (body.defaultPlatforms !== undefined) {
    if (!Array.isArray(body.defaultPlatforms) || body.defaultPlatforms.length === 0) {
      return { error: "invalid_platforms" };
    }
    if (body.defaultPlatforms.some((p) => !VALID_PLATFORMS.has(p))) {
      return { error: "invalid_platforms" };
    }
    patch.defaultPlatforms = body.defaultPlatforms;
  }
  if (body.monthlyCap !== undefined) {
    if (body.monthlyCap === null) {
      patch.monthlyCap = null;
    } else {
      const n = Number(body.monthlyCap);
      if (!Number.isInteger(n) || n <= 0) return { error: "invalid_monthly_cap" };
      patch.monthlyCap = n;
    }
  }
  if (body.systemPromptOverrides !== undefined) {
    if (typeof body.systemPromptOverrides !== "object" || body.systemPromptOverrides === null) {
      return { error: "invalid_overrides" };
    }
    patch.systemPromptOverrides = body.systemPromptOverrides;
  }

  /* Final cross-field check matches the DB CHECK constraint. */
  const finalFreq = patch.frequency ?? body.frequency;
  const finalCron = patch.customCron;
  if (finalFreq === "custom" && (!finalCron || String(finalCron).length === 0)) {
    return { error: "custom_frequency_requires_cron" };
  }

  return { patch };
}

/** Convert camelCase defaults to snake_case for the GET response so the
 *  shape matches a real DB row (the client doesn't have to special-case
 *  the default-vs-real path). */
function toSnake(o: typeof DEFAULT_PREFS): Record<string, unknown> {
  return {
    scripts_per_period: o.scriptsPerPeriod,
    frequency: o.frequency,
    custom_cron: o.customCron,
    default_format: o.defaultFormat,
    default_platforms: o.defaultPlatforms,
    system_prompt_overrides: o.systemPromptOverrides,
    monthly_cap: o.monthlyCap,
  };
}
