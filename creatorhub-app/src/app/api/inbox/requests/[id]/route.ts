/**
 * POST /api/inbox/requests/[id] — approve or deny a pending client join
 * request. `[id]` is a `client_memberships` row id.
 *
 * Body: { action: "approve" | "deny" }
 *
 * Agency-staff only. The membership update runs through the RLS-scoped
 * client (the `client_memberships` update policy is `is_org_staff`), so a
 * staffer can only act on their own org's requests. The `inbox_events`
 * feed item is written with the service-role client (that table has no
 * insert policy by design).
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireAgency } from "@/lib/auth/require-org";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type Params = { params: Promise<{ id: string }> };

type MembershipRow = {
  id: string;
  organization_id: string;
  client_id: string;
  profile_id: string;
  status: "pending" | "active" | "denied";
};

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireAgency();

  const body = (await req.json().catch(() => null)) as {
    action?: "approve" | "deny";
  } | null;
  const action = body?.action;
  if (action !== "approve" && action !== "deny") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const found = await supabase
    .from("client_memberships")
    .select("id, organization_id, client_id, profile_id, status")
    .eq("id", id)
    .maybeSingle();
  const membership = (found.data ?? null) as MembershipRow | null;
  if (!membership) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (membership.status !== "pending") {
    return NextResponse.json({ error: "already_resolved" }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const patch =
    action === "approve"
      ? { status: "active", approved_by: session.userId, approved_at: nowIso }
      : { status: "denied", approved_by: session.userId, approved_at: nowIso };

  const upd = await supabase
    .from("client_memberships")
    .update(patch as never)
    .eq("id", id);
  if (upd.error) {
    log.error("inbox.request_update_failed", { id, action, err: upd.error.message });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  /* Feed item — service role (inbox_events has no insert policy). */
  const service = getSupabaseServiceRole();
  const [clientRes, userRes] = await Promise.all([
    service
      .from("clients")
      .select("display_name")
      .eq("id", membership.client_id)
      .maybeSingle(),
    service
      .from("users")
      .select("email")
      .eq("id", membership.profile_id)
      .maybeSingle(),
  ]);
  const clientName =
    (clientRes.data as { display_name: string } | null)?.display_name ??
    "a workspace";
  const who = (userRes.data as { email: string } | null)?.email ?? "A member";
  const inboxRes = await service.from("inbox_events").insert({
    organization_id: membership.organization_id,
    kind: action === "approve" ? "client_joined" : "client_denied",
    client_id: membership.client_id,
    actor_id: membership.profile_id,
    body:
      action === "approve"
        ? `${who} was approved for ${clientName}.`
        : `${who}'s request for ${clientName} was declined.`,
  } as never);
  if (inboxRes.error) {
    log.warn("inbox.request_event_failed", { id, err: inboxRes.error.message });
  }

  log.info("inbox.request_resolved", { id, action, by: session.userId });
  return NextResponse.json({ ok: true, status: patch.status });
}
