"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { ClientInviteLinkInline } from "./ClientInviteLinkInline";

/**
 * Agency-facing join-link panel for a client's Settings tab. Thin Card
 * wrapper around the shared ClientInviteLinkInline (also used in the Add
 * Client dialog and the per-card Invite dialog).
 */
export function ClientJoinLink({ slug }: { slug: string }) {
  return (
    <Card>
      <CardHeader
        title="Join link"
        description="Share this link (or its QR code) with the creator and their team. They sign in and request access to this workspace."
      />
      <ClientInviteLinkInline slug={slug} />
    </Card>
  );
}
