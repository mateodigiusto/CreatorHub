/**
 * GET   /api/clients/[slug]/brand-profile   — read (single row, 1:1 with client)
 * PATCH /api/clients/[slug]/brand-profile   — update any subset of 18 fields
 *
 * Both endpoints resolve the client via RLS-backed `requireClientAccess`.
 * Strategy fields (next_steps_*) live on the same row.
 *
 * STAGED: lives under _phase3-pending while the legacy /clients/[id] route
 * still exists. Move to src/app/api/clients/[slug]/brand-profile/ after
 * Phase 2's [slug] route lands. See docs/plans/agency-clients-phase3-status.md.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getAgencySession,
  requireClientAccess,
  requireOrgRole,
  HttpError,
  httpErrorResponse,
} from "@/lib/agency/phase3-stubs";
import {
  BRAND_BUILD_FIELDS,
  STRATEGY_FIELDS,
  type BrandProfile,
  type BrandProfilePatch,
} from "@/lib/agency/workspace-types";

type Params = { params: Promise<{ slug: string }> };

// snake_case <-> camelCase mapping. Kept local so this route doesn't depend
// on the generated database.types until Phase 3 is fully cut over.
const PATCHABLE_COLUMNS: Record<keyof BrandProfilePatch, string> = {
  bio: "bio",
  mission: "mission",
  vision: "vision",
  valuesText: "values_text",
  voice: "voice",
  visualStyle: "visual_style",
  audiencePersona: "audience_persona",
  audiencePainPoints: "audience_pain_points",
  uniqueValueProp: "unique_value_prop",
  positioningStatement: "positioning_statement",
  contentPillars: "content_pillars",
  flagshipOffer: "flagship_offer",
  signatureFormat: "signature_format",
  doNotPost: "do_not_post",
  nextStepsGoal: "next_steps_goal",
  nextStepsFocus: "next_steps_focus",
  nextStepsMetrics: "next_steps_metrics",
  nextStepsBlockers: "next_steps_blockers",
};

const KNOWN_KEYS = new Set<string>(Object.keys(PATCHABLE_COLUMNS));

type DbRow = {
  client_id: string;
  organization_id: string;
  bio: string | null;
  mission: string | null;
  vision: string | null;
  values_text: string | null;
  voice: string | null;
  visual_style: string | null;
  audience_persona: string | null;
  audience_pain_points: string | null;
  unique_value_prop: string | null;
  positioning_statement: string | null;
  content_pillars: string[] | null;
  flagship_offer: string | null;
  signature_format: string | null;
  do_not_post: string | null;
  next_steps_goal: string | null;
  next_steps_focus: string | null;
  next_steps_metrics: string | null;
  next_steps_blockers: string | null;
  created_at: string;
  updated_at: string;
};

function rowToProfile(row: DbRow): BrandProfile {
  return {
    clientId: row.client_id,
    organizationId: row.organization_id,
    bio: row.bio,
    mission: row.mission,
    vision: row.vision,
    valuesText: row.values_text,
    voice: row.voice,
    visualStyle: row.visual_style,
    audiencePersona: row.audience_persona,
    audiencePainPoints: row.audience_pain_points,
    uniqueValueProp: row.unique_value_prop,
    positioningStatement: row.positioning_statement,
    contentPillars: row.content_pillars ?? [],
    flagshipOffer: row.flagship_offer,
    signatureFormat: row.signature_format,
    doNotPost: row.do_not_post,
    nextStepsGoal: row.next_steps_goal,
    nextStepsFocus: row.next_steps_focus,
    nextStepsMetrics: row.next_steps_metrics,
    nextStepsBlockers: row.next_steps_blockers,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("client_id", client.id)
      .maybeSingle()
      .returns<DbRow | null>();
    if (error) throw new HttpError(500, "db_read_failed");

    if (!data) {
      // Auto-provision empty row on first read so the UI can PATCH immediately
      // without an explicit create step. Insert is gated by RLS to org staff.
      const { data: inserted, error: insertErr } = await supabase
        .from("brand_profiles")
        .insert({
          client_id: client.id,
          organization_id: client.organizationId,
        } as never)
        .select("*")
        .single()
        .returns<DbRow>();
      if (insertErr || !inserted) throw new HttpError(500, "db_init_failed");
      return NextResponse.json({ profile: rowToProfile(inserted) });
    }

    return NextResponse.json({ profile: rowToProfile(data) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    requireOrgRole(session, ["user", "editor", "director"]);
    const client = await requireClientAccess(slug);

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      throw new HttpError(400, "invalid_json");
    }

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!KNOWN_KEYS.has(key)) continue;
      const column = PATCHABLE_COLUMNS[key as keyof BrandProfilePatch];
      if (key === "contentPillars") {
        if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
          throw new HttpError(400, "content_pillars_invalid");
        }
        updates[column] = (value as string[])
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 8);
      } else {
        if (value !== null && typeof value !== "string") {
          throw new HttpError(400, `field_invalid:${key}`);
        }
        // Cap any single long-form field to keep PATCH bodies bounded.
        updates[column] =
          typeof value === "string" && value.length > 8000
            ? value.slice(0, 8000)
            : value;
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, "no_fields");
    }

    const supabase = await getSupabaseServer();

    // Upsert so the very first PATCH works even before GET auto-provisions.
    const upsertRow = {
      client_id: client.id,
      organization_id: client.organizationId,
      ...updates,
    };

    const { data, error } = await supabase
      .from("brand_profiles")
      .upsert(upsertRow as never, { onConflict: "client_id" })
      .select("*")
      .single()
      .returns<DbRow>();
    if (error) throw new HttpError(500, "db_write_failed");

    return NextResponse.json({ profile: rowToProfile(data) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

// Re-export the canonical field lists so the UI can import them without a
// separate dep on this file. (BrandBuildForm imports from
// workspace-types directly; this is just future-proofing the route module.)
export const _FIELDS = {
  brand: BRAND_BUILD_FIELDS,
  strategy: STRATEGY_FIELDS,
};
