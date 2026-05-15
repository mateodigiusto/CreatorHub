"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Trash2 } from "lucide-react";
import type { ClientAccessRole, ClientMembershipWithProfile } from "@/lib/agency/types";

const INPUT_CLS =
  "w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20";

const ROLE_LABEL: Record<ClientAccessRole, string> = {
  client_owner: "Owner",
  team_assigned: "Team member",
};

export function ClientMembersList({ slug }: { slug: string }) {
  const router = useRouter();
  const [members, setMembers] = useState<ClientMembershipWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ClientAccessRole>("client_owner");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount with cancel flag
    setLoading(true);
    fetch(`/api/clients/${slug}/members`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { members: ClientMembershipWithProfile[] }) => {
        if (!cancelled) setMembers(body.members);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/clients/${slug}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), accessRole: role }),
      });
      if (res.status === 404) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? "No user with that email.");
        return;
      }
      if (res.status === 409) {
        setError("Already a member of this client.");
        return;
      }
      if (!res.ok) {
        setError("Couldn't add member. Try again.");
        return;
      }
      const refresh = await fetch(`/api/clients/${slug}/members`);
      if (refresh.ok) {
        const body = (await refresh.json()) as { members: ClientMembershipWithProfile[] };
        setMembers(body.members);
      }
      setEmail("");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Remove this member?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/clients/${slug}/members/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Couldn't remove member.");
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader
        title="Members"
        description="People who can log into this client's /workspace view."
      />

      <form onSubmit={add} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="creator@example.com"
          className={`${INPUT_CLS} flex-1`}
          maxLength={200}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as ClientAccessRole)}
          className={`${INPUT_CLS} sm:w-44`}
        >
          <option value="client_owner">Owner</option>
          <option value="team_assigned">Team member</option>
        </select>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </form>

      {error && (
        <p className="text-[12.5px] mb-3" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}

      <div className="border-t border-border -mx-5">
        {loading && (
          <p className="px-5 py-4 text-[13px] text-muted">Loading members…</p>
        )}
        {!loading && members.length === 0 && (
          <p className="px-5 py-4 text-[13px] text-muted">
            No members yet. Add the creator&apos;s email to give them workspace access.
          </p>
        )}
        {!loading &&
          members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border last:border-b-0 hover:bg-accent/[0.04]"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] text-text font-medium truncate">
                  {m.profile?.displayName || m.email || "(unknown user)"}
                </div>
                <div className="text-[11.5px] text-muted truncate">
                  {m.email ?? m.profileId}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone={m.accessRole === "client_owner" ? "accent" : "neutral"}>
                  {ROLE_LABEL[m.accessRole]}
                </Badge>
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  disabled={pending}
                  className="text-muted hover:text-text p-1 cursor-pointer disabled:opacity-50"
                  aria-label="Remove member"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
      </div>
    </Card>
  );
}
