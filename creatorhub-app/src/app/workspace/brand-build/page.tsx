/**
 * `/workspace/brand-build` — read or edit the brand profile.
 *
 * `client_owner` can edit (auto-save on blur). `team_assigned` is read-
 * only. Agency staff don't visit this URL — they use
 * `/clients/[slug]/brand-build`.
 *
 * PATCH lands on `/api/clients/[slug]/brand-profile`, owned by Phase 3.
 * Phase 7 reuses the route — RLS lets `client_owner` write per the
 * brand_profiles policy (`is_org_staff` OR `has_client_access`).
 */

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { getSupabaseServer } from "@/lib/supabase/server";
import { canEditBrand } from "@/lib/agency/viewer";
import { WorkspaceBrandFields } from "@/components/agency/workspace/WorkspaceBrandFields";

export const dynamic = "force-dynamic";

const FIELD_DEFS: Array<{
  key: string;
  column: string;
  label: string;
  helper: string;
  rows?: number;
}> = [
  { key: "bio", column: "bio", label: "Bio", helper: "Short intro paragraph.", rows: 3 },
  { key: "mission", column: "mission", label: "Mission", helper: "Why this work exists.", rows: 3 },
  { key: "vision", column: "vision", label: "Vision", helper: "Where this is going.", rows: 3 },
  { key: "valuesText", column: "values_text", label: "Values", helper: "Guiding principles.", rows: 3 },
  { key: "voice", column: "voice", label: "Voice", helper: "Tone, register, recurring phrases.", rows: 3 },
  { key: "visualStyle", column: "visual_style", label: "Visual style", helper: "Palette, framing, typography.", rows: 3 },
  { key: "audiencePersona", column: "audience_persona", label: "Audience persona", helper: "Who shows up.", rows: 3 },
  { key: "audiencePainPoints", column: "audience_pain_points", label: "Audience pain points", helper: "What hurts.", rows: 3 },
  { key: "uniqueValueProp", column: "unique_value_prop", label: "Unique value prop", helper: "The single most-different thing.", rows: 3 },
  { key: "positioningStatement", column: "positioning_statement", label: "Positioning statement", helper: "For [audience], we help [outcome].", rows: 3 },
  { key: "flagshipOffer", column: "flagship_offer", label: "Flagship offer", helper: "The main thing they sell.", rows: 2 },
  { key: "signatureFormat", column: "signature_format", label: "Signature format", helper: "The format you own.", rows: 2 },
  { key: "doNotPost", column: "do_not_post", label: "Do not post", helper: "Hard nos.", rows: 3 },
];

export default async function WorkspaceBrandBuildPage() {
  const viewer = await requireWorkspaceAccess();
  const supabase = await getSupabaseServer();

  const cols = ["client_id", ...FIELD_DEFS.map((f) => f.column), "content_pillars"].join(", ");
  const { data: row } = await supabase
    .from("brand_profiles")
    .select(cols)
    .eq("client_id", viewer.client.id)
    .maybeSingle();

  const profile = (row ?? null) as Record<string, unknown> | null;

  const editable = canEditBrand(viewer.accessRole);
  const fields = FIELD_DEFS.map((f) => ({
    key: f.column,
    label: f.label,
    helper: f.helper,
    rows: f.rows,
    value: (profile?.[f.column] as string | null | undefined) ?? null,
  }));

  const pillars = ((profile?.content_pillars as string[] | null) ?? []).filter(
    Boolean,
  );

  return (
    <div className="p-6">
      <PageHeader
        title="Brand Build"
        description={
          editable
            ? "Your brand, in your words. Changes save automatically when you tab out of a field."
            : "Your team is responsible for keeping this up to date. Read-only for your role."
        }
      />

      {pillars.length > 0 && (
        <Card className="mb-4">
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
            Content pillars
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pillars.map((p, i) => (
              <Badge key={i} tone="accent">
                {p}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <WorkspaceBrandFields
        fields={fields}
        editable={editable}
        endpoint={`/api/clients/${viewer.client.slug}/brand-profile`}
      />
    </div>
  );
}
