/**
 * /join-org/[token] — staff invite accept screen.
 *
 * An agency admin invites a teammate by email; this is where they accept.
 *   1. Look the token up via service-role (the visitor isn't a member yet).
 *   2. Invalid / used / expired → dead-end message.
 *   3. Not signed in → /login?next=/join-org/[token].
 *   4. Signed in as the wrong email → "wrong account" message (the invite
 *      is email-targeted; the redeem API enforces the match too).
 *   5. Already in this org → straight to /clients.
 *   6. Otherwise → the accept screen.
 */

import { redirect } from "next/navigation";
import { Sparkles, AlertTriangle, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { JoinOrgAccept } from "./JoinOrgAccept";

export const dynamic = "force-dynamic";

type InviteLookup = {
  organization_id: string;
  email: string;
  role: "user" | "editor" | "director";
  is_admin: boolean;
  expires_at: string;
  accepted_at: string | null;
};

const ROLE_LABEL: Record<InviteLookup["role"], string> = {
  user: "Team member",
  editor: "Editor",
  director: "Director",
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

export default async function JoinOrgPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const service = getSupabaseServiceRole();

  const inviteRes = await service
    .from("organization_invites")
    .select("organization_id, email, role, is_admin, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();
  const invite = (inviteRes.data ?? null) as InviteLookup | null;

  if (!invite) {
    return (
      <DeadEnd message="We couldn't find that invite link. Ask your agency admin to send a fresh one." />
    );
  }
  if (invite.accepted_at) {
    return <DeadEnd message="This invite has already been used." />;
  }
  if (new Date(invite.expires_at) <= new Date()) {
    return (
      <DeadEnd message="This invite has expired. Ask your agency admin for a new one." />
    );
  }

  const orgRes = await service
    .from("organizations")
    .select("name")
    .eq("id", invite.organization_id)
    .maybeSingle();
  const orgName = (orgRes.data as { name: string } | null)?.name ?? "an agency";

  /* Auth gate. */
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect(`/login?next=/join-org/${encodeURIComponent(token)}`);
  }

  /* Wrong account — the invite is email-targeted. */
  if ((user.email ?? "").toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center py-10 px-8">
          <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <h1 className="text-[18px] font-semibold text-text">Wrong account</h1>
          <p className="text-[13.5px] text-text-2 mt-2 leading-relaxed">
            This invite is for{" "}
            <span className="font-medium text-text">{invite.email}</span>, but
            you&apos;re signed in as{" "}
            <span className="font-medium text-text">{user.email}</span>. Sign
            out and sign back in with the invited email.
          </p>
          <form action="/api/auth/sign-out" method="post" className="mt-6">
            <button
              type="submit"
              className="inline-flex items-center justify-center h-9 px-4 rounded-[8px] text-[13px] font-medium bg-surface-2 border border-border text-text hover:border-accent-border transition-colors"
            >
              Sign out
            </button>
          </form>
        </Card>
      </div>
    );
  }

  /* Already in this org? */
  const memberRes = await service
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", invite.organization_id)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (memberRes.data) redirect("/clients");

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
          Join {orgName}
        </h1>
        <p className="text-[13.5px] text-text-2 mt-2 leading-relaxed">
          You&apos;ve been invited to join{" "}
          <span className="font-medium text-text">{orgName}</span> on
          CreatorHub.
        </p>
        <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-surface-2 border border-border text-[12px] text-text-2">
          <Users className="w-3.5 h-3.5 text-muted" />
          {ROLE_LABEL[invite.role]}
          {invite.is_admin && " · Admin"}
        </div>
        <JoinOrgAccept token={token} />
      </Card>
    </div>
  );
}
