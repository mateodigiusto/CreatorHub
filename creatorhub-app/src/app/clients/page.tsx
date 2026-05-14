/**
 * Agency all-clients grid — the landing page after sign-in. Lists the
 * creators this org manages, with an Add Client affordance gated by the
 * plan's maxClients.
 */

import Link from "next/link";
import { Users2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAgency } from "@/lib/auth/require-org";
import { getSupabaseServer } from "@/lib/supabase/server";
import { clientQuota } from "@/lib/billing/limits";
import { ClientGrid } from "@/components/clients/ClientGrid";
import { AddClientButton } from "@/components/clients/AddClientButton";
import type { Client, ClientStatus } from "@/lib/agency/types";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await requireAgency();
  const supabase = await getSupabaseServer();
  const res = await supabase
    .from("clients")
    .select(
      "id, organization_id, slug, display_name, tagline, status, instagram_handle, created_by, created_at, updated_at",
    )
    .eq("organization_id", session.organization.id)
    .order("display_name", { ascending: true });

  type Row = {
    id: string;
    organization_id: string;
    slug: string;
    display_name: string;
    tagline: string | null;
    status: ClientStatus;
    instagram_handle: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };
  const rows = (res.data ?? []) as unknown as Row[];
  const clients: Client[] = rows.map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    slug: r.slug,
    displayName: r.display_name,
    tagline: r.tagline,
    status: r.status,
    instagramHandle: r.instagram_handle,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const quota = await clientQuota(session.plan, session.organization.id);

  return (
    <div className="p-6 max-w-[1200px]">
      <PageHeader
        title="Clients"
        description={
          quota.max === Number.POSITIVE_INFINITY
            ? `${quota.used} client${quota.used === 1 ? "" : "s"}`
            : `${quota.used} of ${quota.max} on the ${session.plan} plan`
        }
        actions={
          <AddClientButton
            atLimit={quota.atLimit}
            limitMessage={
              quota.atLimit
                ? `Plan limit reached. Upgrade to add more clients.`
                : undefined
            }
          />
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users2 className="w-6 h-6" />}
          title="No clients yet"
          description="Add your first creator to start planning content, sharing assets, and tracking results."
          showSampleDataCta={false}
        />
      ) : (
        <ClientGrid clients={clients} />
      )}

      {quota.atLimit ? (
        <p className="mt-6 text-[12.5px] text-muted">
          You&apos;ve hit the {session.plan} plan limit. Upgrade in{" "}
          <Link href="/settings/billing" className="text-accent hover:underline">
            Settings → Billing
          </Link>{" "}
          to add more clients.
        </p>
      ) : null}
    </div>
  );
}
