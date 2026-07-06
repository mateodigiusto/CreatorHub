/**
 * Client Settings — profile form + members + danger zone.
 *
 * The form auto-routes the user to the new URL on a slug change. Member
 * management uses /api/clients/[slug]/members. Hard delete is gated by the
 * org admin flag (the API also enforces this).
 */

import { requireClientAccess } from "@/lib/auth/require-client-access";
import { canDeleteClient, canPreviewAsClient } from "@/lib/agency/permissions";
import { ClientSettingsForm } from "@/components/clients/ClientSettingsForm";
import { ClientJoinLink } from "@/components/clients/ClientJoinLink";
import { ClientMembersList } from "@/components/clients/ClientMembersList";
import { ClientDangerZone } from "@/components/clients/ClientDangerZone";
import { ClientPreviewCard } from "@/components/clients/ClientPreviewCard";

export default async function ClientSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { session, client } = await requireClientAccess(slug);

  return (
    <div className="grid gap-6 max-w-3xl">
      {canPreviewAsClient(session) && (
        <ClientPreviewCard slug={client.slug} />
      )}
      <ClientSettingsForm client={client} />
      <ClientJoinLink slug={client.slug} />
      <ClientMembersList slug={client.slug} />
      <ClientDangerZone client={client} canDelete={canDeleteClient(session)} />
    </div>
  );
}
