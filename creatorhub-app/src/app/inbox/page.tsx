/**
 * /inbox — the agency's client-access inbox.
 *
 *   • Pending requests — `client_memberships` rows with status='pending',
 *     each with Approve / Deny actions.
 *   • Activity feed — `inbox_events` (joined / denied confirmations) with
 *     mark-read.
 *   • Approval setting — `organizations.client_approval_required`: when off,
 *     join-link redemptions go straight to `active` and skip this inbox.
 *
 * Agency-staff only. Data is read with the service-role client, every query
 * scoped by the authenticated org id (the `users` join for joiner emails
 * isn't reachable through RLS otherwise).
 */

import { requireAgency } from "@/lib/auth/require-org";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { InboxView } from "@/components/inbox/InboxView";
import type { PendingRequest, InboxEvent } from "@/components/inbox/InboxView";

export const dynamic = "force-dynamic";

type MembershipRow = {
  id: string;
  client_id: string;
  profile_id: string;
  created_at: string;
  clients: { slug: string; display_name: string } | null;
};

type EventRow = {
  id: string;
  kind: "client_join_request" | "client_joined" | "client_denied";
  body: string;
  client_id: string | null;
  read_at: string | null;
  created_at: string;
};

export default async function InboxPage() {
  const session = await requireAgency();
  const orgId = session.organization.id;
  const service = getSupabaseServiceRole();

  const [pendingRes, eventsRes, orgRes] = await Promise.all([
    service
      .from("client_memberships")
      .select(
        "id, client_id, profile_id, created_at, clients ( slug, display_name )",
      )
      .eq("organization_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    service
      .from("inbox_events")
      .select("id, kind, body, client_id, read_at, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50),
    service
      .from("organizations")
      .select("client_approval_required")
      .eq("id", orgId)
      .maybeSingle(),
  ]);

  const pendingRows = (pendingRes.data ?? []) as unknown as MembershipRow[];
  const profileIds = pendingRows.map((r) => r.profile_id);
  const usersRes = profileIds.length
    ? await service.from("users").select("id, email").in("id", profileIds)
    : { data: [] };
  const emailById = new Map(
    ((usersRes.data ?? []) as unknown as Array<{ id: string; email: string }>).map(
      (u) => [u.id, u.email],
    ),
  );

  const pending: PendingRequest[] = pendingRows.map((r) => ({
    id: r.id,
    clientSlug: r.clients?.slug ?? "",
    clientName: r.clients?.display_name ?? "Unknown client",
    joinerEmail: emailById.get(r.profile_id) ?? "Unknown",
    createdAt: r.created_at,
  }));

  const events: InboxEvent[] = (
    (eventsRes.data ?? []) as unknown as EventRow[]
  ).map((e) => ({
    id: e.id,
    kind: e.kind,
    body: e.body,
    readAt: e.read_at,
    createdAt: e.created_at,
  }));

  const approvalRequired =
    (orgRes.data as { client_approval_required: boolean } | null)
      ?.client_approval_required ?? true;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Inbox"
        description="Client join requests and recent workspace activity."
      />
      <InboxView
        pending={pending}
        events={events}
        approvalRequired={approvalRequired}
        isAdmin={session.isAdmin}
      />
    </div>
  );
}
