/**
 * GET  /api/clients/[slug]/invite — the client's active join link, created
 *                                   on first request (one reusable link
 *                                   per client).
 * POST /api/clients/[slug]/invite — rotate: revoke the current link, mint a
 *                                   fresh token (invalidates any shared
 *                                   copies / QR codes).
 *
 * Agency-staff only — `requireClientAccess` resolves the client within the
 * caller's org and `requireAgency` (inside it) rejects solo accounts.
 *
 * The token is redeemed by the public /join/[token] flow, which creates a
 * `client_memberships` row (pending or active, per the org's
 * `client_approval_required` setting).
 */

import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireClientAccess } from "@/lib/auth/require-client-access";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type Params = { params: Promise<{ slug: string }> };

type InviteRow = {
  id: string;
  token: string;
  access_role: "client_owner" | "team_assigned";
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

function joinUrl(req: NextRequest, token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  return `${base.replace(/\/$/, "")}/join/${token}`;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { session, client } = await requireClientAccess(slug);
  const supabase = await getSupabaseServer();

  /* Existing active link? (not revoked, not past expiry) */
  const existing = await supabase
    .from("client_invites")
    .select("id, token, access_role, expires_at, revoked_at, created_at")
    .eq("client_id", client.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = (existing.data ?? null) as InviteRow | null;
  if (row && (!row.expires_at || new Date(row.expires_at) > new Date())) {
    return NextResponse.json({
      token: row.token,
      joinUrl: joinUrl(req, row.token),
      accessRole: row.access_role,
      createdAt: row.created_at,
    });
  }

  /* None — mint one. Reusable, no expiry (revoke to invalidate). */
  const token = newToken();
  const insertRes = await supabase
    .from("client_invites")
    .insert({
      organization_id: session.organization.id,
      client_id: client.id,
      access_role: "client_owner",
      token,
      created_by: session.userId,
    } as never)
    .select("id, token, access_role, expires_at, revoked_at, created_at")
    .single();

  if (insertRes.error) {
    log.error("client_invite.create_failed", { slug, err: insertRes.error.message });
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
  const created = insertRes.data as unknown as InviteRow;
  return NextResponse.json({
    token: created.token,
    joinUrl: joinUrl(req, created.token),
    accessRole: created.access_role,
    createdAt: created.created_at,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { session, client } = await requireClientAccess(slug);
  const supabase = await getSupabaseServer();

  /* Revoke every active link for this client, then mint a fresh one. */
  const revokeRes = await supabase
    .from("client_invites")
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("client_id", client.id)
    .is("revoked_at", null);
  if (revokeRes.error) {
    log.error("client_invite.revoke_failed", { slug, err: revokeRes.error.message });
    return NextResponse.json({ error: "rotate_failed" }, { status: 500 });
  }

  const token = newToken();
  const insertRes = await supabase
    .from("client_invites")
    .insert({
      organization_id: session.organization.id,
      client_id: client.id,
      access_role: "client_owner",
      token,
      created_by: session.userId,
    } as never)
    .select("id, token, access_role, expires_at, revoked_at, created_at")
    .single();

  if (insertRes.error) {
    log.error("client_invite.rotate_create_failed", { slug, err: insertRes.error.message });
    return NextResponse.json({ error: "rotate_failed" }, { status: 500 });
  }
  const created = insertRes.data as unknown as InviteRow;
  return NextResponse.json({
    token: created.token,
    joinUrl: joinUrl(req, created.token),
    accessRole: created.access_role,
    createdAt: created.created_at,
  });
}
