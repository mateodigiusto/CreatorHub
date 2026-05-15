/**
 * `/workspace/strategy` — the 4 next-steps fields on `brand_profiles`.
 *
 * Same row as Brand Build; same PATCH endpoint
 * (`/api/clients/[slug]/brand-profile`). `client_owner` can edit,
 * `team_assigned` is read-only.
 */

import { PageHeader } from "@/components/ui/PageHeader";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { getSupabaseServer } from "@/lib/supabase/server";
import { canEditBrand } from "@/lib/agency/viewer";
import { WorkspaceBrandFields } from "@/components/agency/workspace/WorkspaceBrandFields";

export const dynamic = "force-dynamic";

const STRATEGY_FIELDS: Array<{
  column: string;
  label: string;
  helper: string;
  rows: number;
}> = [
  {
    column: "next_steps_goal",
    label: "Goal for the next 30 days",
    helper: "What we want true at the end of this month.",
    rows: 3,
  },
  {
    column: "next_steps_focus",
    label: "Focus areas",
    helper: "The 2–3 things we're investing in.",
    rows: 3,
  },
  {
    column: "next_steps_metrics",
    label: "Metrics to watch",
    helper: "The numbers that prove we're moving.",
    rows: 3,
  },
  {
    column: "next_steps_blockers",
    label: "Open questions / blockers",
    helper: "Decisions, dependencies, things we don't know yet.",
    rows: 3,
  },
];

export default async function WorkspaceStrategyPage() {
  const viewer = await requireWorkspaceAccess();
  const supabase = await getSupabaseServer();

  const { data: row } = await supabase
    .from("brand_profiles")
    .select(STRATEGY_FIELDS.map((f) => f.column).join(", "))
    .eq("client_id", viewer.client.id)
    .maybeSingle();

  const profile = (row ?? null) as Record<string, string | null> | null;
  const editable = canEditBrand(viewer.accessRole);
  const fields = STRATEGY_FIELDS.map((f) => ({
    key: f.column,
    label: f.label,
    helper: f.helper,
    rows: f.rows,
    value: profile?.[f.column] ?? null,
  }));

  return (
    <div className="p-6">
      <PageHeader
        title="Strategy"
        description={
          editable
            ? "Where attention goes over the next 30 days. Saves automatically."
            : "Your 30-day plan, maintained by your team."
        }
      />
      <WorkspaceBrandFields
        fields={fields}
        editable={editable}
        endpoint={`/api/clients/${viewer.client.slug}/brand-profile`}
      />
    </div>
  );
}
