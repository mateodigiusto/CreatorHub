/**
 * GET    /api/clients/[id]   — relationship detail (with counterparty info)
 * PATCH  /api/clients/[id]   — accept / decline / end (status transitions)
 *
 * Status state machine:
 *   pending  → declined | active     (creator side, via accept-invite trigger or PATCH)
 *   active   → ended                 (either side)
 *   pending  → ended (cancel)        (manager side)
 *
 * RLS handles the membership check. The route only validates the requested
 * transition is legal from the current state.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { notify } from "@/lib/notifications";
import { inviteAcceptedEmail } from "@/lib/email/templates";
import type { RelationshipDetail, RelationshipStatus } from "@/lib/clients/types";

type RelationshipRow = {
  id: string;
  manager_id: string;
  creator_id: string | null;
  invited_email: string | null;
  status: RelationshipStatus;
  created_at: string;
  accepted_at: string | null;
  ended_at: string | null;
  expires_at: string;
};

type CounterpartyRow = {
  id: string;
  email: string;
  display_name: string | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: row } = await supabase
    .from("creator_relationships")
    .select(
      "id, manager_id, creator_id, invited_email, status, created_at, accepted_at, ended_at, expires_at",
    )
    .eq("id", id)
    .returns<RelationshipRow[]>()
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const userId = userRes.user.id;
  const perspective = row.manager_id === userId ? "manager" : "creator";
  const counterpartyId =
    perspective === "manager" ? row.creator_id : row.manager_id;

  let counterparty: CounterpartyRow | null = null;
  if (counterpartyId) {
    const admin = getSupabaseServiceRole();
    const { data } = await admin
      .from("users")
      .select("id, email, display_name")
      .eq("id", counterpartyId)
      .returns<CounterpartyRow[]>()
      .maybeSingle();
    counterparty = data ?? null;
  }

  const detail: RelationshipDetail = {
    id: row.id,
    perspective,
    status: row.status,
    counterpartyName: counterparty?.display_name ?? null,
    counterpartyEmail: counterparty?.email ?? row.invited_email,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    endedAt: row.ended_at,
    expiresAt: row.expires_at,
    managerId: row.manager_id,
    creatorId: row.creator_id,
    invitedEmail: row.invited_email,
  };

  return NextResponse.json({ relationship: detail });
}

type PatchBody = { status?: "active" | "declined" | "ended" };

const ALLOWED_TRANSITIONS: Record<
  RelationshipStatus,
  Array<"active" | "declined" | "ended">
> = {
  pending: ["active", "declined", "ended"],
  active: ["ended"],
  declined: [],
  ended: [],
  expired: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const next = body.status;
  if (!next || !["active", "declined", "ended"].includes(next)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const { data: current } = await supabase
    .from("creator_relationships")
    .select("id, manager_id, creator_id, status")
    .eq("id", id)
    .returns<Array<{
      id: string;
      manager_id: string;
      creator_id: string | null;
      status: RelationshipStatus;
    }>>()
    .maybeSingle();
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!ALLOWED_TRANSITIONS[current.status].includes(next)) {
    return NextResponse.json(
      { error: "invalid_transition", from: current.status, to: next },
      { status: 400 },
    );
  }

  const userId = userRes.user.id;
  const isManager = current.manager_id === userId;
  const isCreator = current.creator_id === userId;

  /* Manager can do anything. Creator can only flip status from active to
     ended/declined (matches the RLS policy). */
  if (next === "active") {
    if (!isManager && !isCreator) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else if (next === "declined") {
    if (!isCreator) {
      return NextResponse.json({ error: "manager_cannot_decline" }, { status: 403 });
    }
  } else if (next === "ended") {
    if (!isManager && !isCreator) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const patch: Record<string, string | null> = { status: next };
  if (next === "active") {
    patch.accepted_at = new Date().toISOString();
  }
  if (next === "ended") {
    patch.ended_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("creator_relationships")
    .update(patch as never)
    .eq("id", id);
  if (error) {
    log.error("clients.status_update_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  /* Notify the counterparty of the state change. Email only on `active`
     (the meaningful "they accepted!" moment) — declines and endings stay
     in-app to avoid feeling sad-mail-spammy. */
  const counterpartyId = isManager ? current.creator_id : current.manager_id;
  if (counterpartyId) {
    const verb =
      next === "active" ? "accepted" : next === "declined" ? "declined" : "ended";
    const actorName = userRes.user.email?.split("@")[0] ?? "Someone";
    await notify({
      recipientId: counterpartyId,
      kind: "invite",
      body: `Your relationship was ${verb}`,
      targetType: "relationship",
      targetId: id,
      email:
        next === "active"
          ? inviteAcceptedEmail({
              recipientName: "",
              counterpartyName: actorName,
              relationshipId: id,
            })
          : undefined,
    });
  }

  return NextResponse.json({ ok: true });
}
