/**
 * Internal tab — staff-only scratch pad. RLS strips this from
 * client-side users; the page is hidden from the /workspace/* portal.
 *
 * Phase 2's SubNav should mark this entry with `staffOnly: true` and
 * suppress the link for `client_owner` / `team_assigned` viewers.
 *
 * STAGED. Final location: src/app/clients/[slug]/internal/page.tsx.
 */

import { PageHeader } from "@/components/ui/PageHeader";
import { InternalNotesForm } from "@/components/agency/InternalNotesForm";

type Props = { params: Promise<{ slug: string }> };

export default async function InternalPage({ params }: Props) {
  const { slug } = await params;
  return (
    <div>
      <PageHeader
        title="Internal"
        description="Private working notes — sensitive context, decisions to revisit, things you'd rather not share with the client. Only org staff see this tab."
      />
      <InternalNotesForm slug={slug} />
    </div>
  );
}
