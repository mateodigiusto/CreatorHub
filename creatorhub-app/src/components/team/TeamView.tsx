"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Trash2,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  Mail,
  X,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export type OrgRole = "user" | "editor" | "director";

export type TeamMember = {
  id: string;
  profileId: string;
  email: string;
  displayName: string | null;
  role: OrgRole;
  isAdmin: boolean;
  isSelf: boolean;
};

export type TeamInvite = {
  id: string;
  email: string;
  role: OrgRole;
  isAdmin: boolean;
  expiresAt: string;
};

const ROLE_LABEL: Record<OrgRole, string> = {
  user: "Team member",
  editor: "Editor",
  director: "Director",
};
const ROLES: OrgRole[] = ["user", "editor", "director"];

const SELECT_CLS =
  "h-8 px-2 rounded-[8px] bg-surface-2 border border-border text-[12.5px] text-text focus:outline-none focus:border-accent/40";
const INPUT_CLS =
  "w-full h-10 px-3 rounded-[10px] bg-surface-2 border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20";

export function TeamView({
  members,
  invites,
  isAdmin,
  organizationName,
}: {
  members: TeamMember[];
  invites: TeamInvite[];
  isAdmin: boolean;
  organizationName: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("editor");
  const [inviteAdmin, setInviteAdmin] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [lastLink, setLastLink] = useState<{ email: string; url: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  function refresh() {
    startRefresh(() => router.refresh());
  }

  async function updateMember(
    id: string,
    patch: { role?: OrgRole; isAdmin?: boolean },
  ) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/team/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(b?.message ?? "Couldn't update that teammate.");
      } else {
        refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/team/members/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(b?.message ?? "Couldn't remove that teammate.");
      } else {
        refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function revokeInvite(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/team/invites/${id}`, { method: "DELETE" });
      if (res.ok) refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          isAdmin: inviteAdmin,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(
          b?.error === "invalid_email"
            ? "That doesn't look like a valid email."
            : "Couldn't create the invite. Try again.",
        );
        return;
      }
      const body = (await res.json()) as { email: string; joinUrl: string };
      setLastLink({ email: body.email, url: body.joinUrl });
      setInviteEmail("");
      setInviteAdmin(false);
      refresh();
    } finally {
      setInviting(false);
    }
  }

  function copyLink() {
    if (!lastLink) return;
    void navigator.clipboard.writeText(lastLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-6">
      {error && (
        <div className="px-3 py-2.5 rounded-[10px] border border-error/30 bg-error/10 text-error text-[12.5px]">
          {error}
        </div>
      )}

      {/* Invite form (admins only) */}
      {isAdmin && (
        <Card>
          <CardHeader
            title="Invite a teammate"
            description={`Send an invite to join ${organizationName}. They sign in with that email to accept.`}
          />
          <form onSubmit={sendInvite} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@email.com"
                  className={`${INPUT_CLS} pl-9`}
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                className={`${SELECT_CLS} h-10`}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                {inviting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                Invite
              </Button>
            </div>
            <label className="flex items-center gap-2 text-[12.5px] text-text-2 cursor-pointer">
              <input
                type="checkbox"
                checked={inviteAdmin}
                onChange={(e) => setInviteAdmin(e.target.checked)}
                className="rounded border-border"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-muted" />
              Also make them an admin (can invite, manage billing, delete clients)
            </label>
          </form>

          {lastLink && (
            <div className="mt-4 p-3 rounded-[10px] bg-accent-soft border border-accent-border">
              <p className="text-[12px] text-text-2 mb-2">
                Invite created for{" "}
                <span className="font-medium text-text">{lastLink.email}</span>.
                Share this link (an email goes out automatically once Resend is
                configured):
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={lastLink.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 h-9 px-3 rounded-[8px] bg-surface border border-border text-[12px] text-text font-mono focus:outline-none"
                />
                <Button size="sm" variant="ghost" onClick={copyLink}>
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Members */}
      <Card>
        <CardHeader
          title="Members"
          description={`${members.length} ${members.length === 1 ? "person" : "people"} in your agency.`}
        />
        <ul className="divide-y divide-border -mx-1">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 px-1 py-3"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-text truncate flex items-center gap-2">
                  {m.displayName || m.email}
                  {m.isSelf && (
                    <span className="text-[10.5px] text-muted font-normal">
                      (you)
                    </span>
                  )}
                  {m.isAdmin && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-accent bg-accent-soft border border-accent-border px-1.5 py-0.5 rounded tracking-wide">
                      Admin
                    </span>
                  )}
                </div>
                {m.displayName && (
                  <div className="text-[12px] text-muted truncate">{m.email}</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin ? (
                  <>
                    <select
                      value={m.role}
                      disabled={busyId === m.id}
                      onChange={(e) =>
                        updateMember(m.id, { role: e.target.value as OrgRole })
                      }
                      className={SELECT_CLS}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() =>
                        updateMember(m.id, { isAdmin: !m.isAdmin })
                      }
                      title={m.isAdmin ? "Remove admin" : "Make admin"}
                      className={`h-8 px-2 rounded-[8px] border text-[11.5px] font-medium transition-colors ${
                        m.isAdmin
                          ? "border-accent-border bg-accent-soft text-accent"
                          : "border-border bg-surface-2 text-muted hover:text-text"
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>
                    {!m.isSelf && (
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => removeMember(m.id)}
                        title="Remove from agency"
                        className="h-8 px-2 rounded-[8px] border border-border bg-surface-2 text-muted hover:text-error hover:border-error/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-[12px] text-muted">
                    {ROLE_LABEL[m.role]}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Pending invites */}
      {isAdmin && invites.length > 0 && (
        <Card>
          <CardHeader
            title="Pending invites"
            description={`${invites.length} ${invites.length === 1 ? "invite hasn't" : "invites haven't"} been accepted yet.`}
          />
          <ul className="divide-y divide-border -mx-1">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 px-1 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-[13px] text-text truncate">
                    {inv.email}
                  </div>
                  <div className="text-[11.5px] text-muted">
                    {ROLE_LABEL[inv.role]}
                    {inv.isAdmin && " · Admin"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === inv.id}
                  onClick={() => revokeInvite(inv.id)}
                >
                  <X className="w-3.5 h-3.5" /> Revoke
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
