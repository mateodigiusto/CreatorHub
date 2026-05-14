/**
 * /join/[token] — public client join screen.
 *
 * An agency shares this link (or its QR) for a client. The flow:
 *   1. Look the token up via the service-role client (the visitor isn't a
 *      member of anything yet, so RLS would hide every row).
 *   2. Invalid / revoked / expired → a dead-end message, no auth needed.
 *   3. Not signed in → bounce through /login?next=/join/[token]; the
 *      callback gives /join/* paths priority over track-routing.
 *   4. Already a member → straight to /workspace (active) or /pending.
 *   5. Otherwise → the "you've been invited" accept screen. Accepting
 *      POSTs /api/join/[token], which creates the membership.
 */

import { redirect } from "next/navigation";
import { Sparkles, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { JoinAccept } from "./JoinAccept";

export const dynamic = "force-dynamic";

type InviteLookup = {
  organization_id: string;
  client_id: string;
  revoked_at: string | null;
  expires_at: string | null;
};

function DeadEnd({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center py-10 px-8">
        <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-5 h-5 text-muted" />
        </div>
        <h1 className="text-[18px] font-semibold text-text">Invite unavailable</h1>
        <p className="text-[13.5px] text-text-2 mt-2 leading-relaxed">{message}</p>
        <a
          href="/login"
          className="inline-flex items-center justify-center h-9 px-4 mt-6 rounded-[8px] text-[13px] font-medium bg-surface-2 border border-border text-text hover:border-accent-border transition-colors"
        >
          Go to sign in
        </a>
      </Card>
    </div>
  );
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const service = getSupabaseServiceRole();

  const inviteRes = await service
    .from("client_invites")
    .select("organization_id, client_id, revoked_at, expires_at")
    .eq("token", token)
    .maybeSingle();
  const invite = (inviteRes.data ?? null) as InviteLookup | null;

  if (!invite) {
    return (
      <DeadEnd message="We couldn't find that invite link. Double-check the URL, or ask the agency to send a fresh one." />
    );
  }
  if (invite.revoked_at) {
    return (
      <DeadEnd message="This invite link has been turned off. Ask the agency for a new one." />
    );
  }
  if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
    return (
      <DeadEnd message="This invite link has expired. Ask the agency for a new one." />
    );
  }

  /* Resolve the display copy. */
  const [clientRes, orgRes] = await Promise.all([
    service
      .from("clients")
      .select("display_name")
      .eq("id", invite.client_id)
      .maybeSingle(),
    service
      .from("organizations")
      .select("name, client_approval_required")
      .eq("id", invite.organization_id)
      .maybeSingle(),
  ]);
  const clientName =
    (clientRes.data as { display_name: string } | null)?.display_name ??
    "a workspace";
  const org = orgRes.data as
    | { name: string; client_approval_required: boolean }
    | null;
  const orgName = org?.name ?? "an agency";
  const approvalRequired = org?.client_approval_required ?? true;

  /* Auth gate — anonymous visitors round-trip through login. */
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect(`/login?next=/join/${encodeURIComponent(token)}`);
  }

  /* Already a member of this client? Skip the accept screen. */
  const membershipRes = await service
    .from("client_memberships")
    .select("status")
    .eq("client_id", invite.client_id)
    .eq("profile_id", user.id)
    .maybeSingle();
  const membership = membershipRes.data as
    | { status: "pending" | "active" | "denied" }
    | null;
  if (membership?.status === "active") redirect("/workspace");
  if (membership?.status === "pending") redirect("/pending");

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center py-10 px-8">
        <div
          className="w-12 h-12 rounded-2xl mx-auto grid place-items-center text-white mb-4"
          style={{
            background: "linear-gradient(135deg, #14315E, #0B1F3A)",
            boxShadow: "0 8px 24px -8px rgba(11,31,58,0.45)",
          }}
        >
          <Sparkles className="w-5 h-5" />
        </div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-text leading-tight">
          Join {clientName}
        </h1>
        <p className="text-[13.5px] text-text-2 mt-2 leading-relaxed">
          <span className="font-medium text-text">{orgName}</span> invited you
          to the <span className="font-medium text-text">{clientName}</span>{" "}
          workspace on CreatorHub — your space to follow the content pipeline,
          review videos, and see what&apos;s scheduled.
        </p>
        <JoinAccept token={token} approvalRequired={approvalRequired} />
      </Card>
    </div>
  );
}
