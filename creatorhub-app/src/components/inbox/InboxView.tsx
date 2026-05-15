"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  UserPlus,
  ShieldCheck,
  ShieldOff,
  Inbox as InboxIcon,
  Loader2,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export type PendingRequest = {
  id: string;
  clientSlug: string;
  clientName: string;
  joinerEmail: string;
  createdAt: string;
};

export type InboxEvent = {
  id: string;
  kind: "client_join_request" | "client_joined" | "client_denied";
  body: string;
  readAt: string | null;
  createdAt: string;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function InboxView({
  pending,
  events,
  approvalRequired,
  isAdmin,
}: {
  pending: PendingRequest[];
  events: InboxEvent[];
  approvalRequired: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approval, setApproval] = useState(approvalRequired);
  const [togglingApproval, startToggle] = useTransition();
  const [, startRefresh] = useTransition();

  async function resolve(id: string, action: "approve" | "deny") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/inbox/requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) startRefresh(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  function markRead(id?: string) {
    void fetch("/api/inbox/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    }).then(() => startRefresh(() => router.refresh()));
  }

  function toggleApproval() {
    const nextVal = !approval;
    setApproval(nextVal);
    startToggle(async () => {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientApprovalRequired: nextVal }),
      });
      if (!res.ok) setApproval(!nextVal); // revert on failure
    });
  }

  const unread = events.filter((e) => !e.readAt);

  return (
    <div className="grid gap-6">
      {/* Approval setting */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-surface-2 border border-border grid place-items-center shrink-0">
              {approval ? (
                <ShieldCheck className="w-4 h-4 text-accent" />
              ) : (
                <ShieldOff className="w-4 h-4 text-muted" />
              )}
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-text">
                Require approval for new members
              </h3>
              <p className="text-[12.5px] text-muted mt-0.5 leading-relaxed">
                {approval
                  ? "People who use a join link wait here until you approve them."
                  : "People who use a join link get into the workspace immediately."}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={approval}
            disabled={!isAdmin || togglingApproval}
            onClick={toggleApproval}
            title={isAdmin ? undefined : "Only org admins can change this"}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              approval ? "bg-accent" : "bg-surface-3"
            } ${!isAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${
                approval ? "translate-x-5.5" : "translate-x-1"
              }`}
              style={{
                height: 18,
                width: 18,
                transform: approval ? "translateX(22px)" : "translateX(3px)",
              }}
            />
          </button>
        </div>
      </Card>

      {/* Pending requests */}
      <Card>
        <CardHeader
          title="Pending requests"
          description={
            pending.length > 0
              ? `${pending.length} ${pending.length === 1 ? "person is" : "people are"} waiting for access.`
              : "No one is waiting for access right now."
          }
        />
        {pending.length === 0 ? (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-10 h-10 rounded-full bg-surface-2 border border-border grid place-items-center mb-2">
              <UserPlus className="w-4 h-4 text-muted" />
            </div>
            <p className="text-[12.5px] text-muted">
              Join requests show up here when someone uses a client&apos;s join
              link.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border -mx-1">
            {pending.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 px-1 py-3"
              >
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium text-text truncate">
                    {r.joinerEmail}
                  </div>
                  <div className="text-[12px] text-muted">
                    wants to join{" "}
                    <span className="text-text-2 font-medium">
                      {r.clientName}
                    </span>{" "}
                    · {relativeTime(r.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === r.id}
                    onClick={() => resolve(r.id, "deny")}
                  >
                    <X className="w-3.5 h-3.5" /> Deny
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => resolve(r.id, "approve")}
                  >
                    {busyId === r.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}{" "}
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Activity feed */}
      <Card>
        <CardHeader
          title="Activity"
          description="Recent join and approval events."
          action={
            unread.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={() => markRead()}>
                Mark all read
              </Button>
            ) : undefined
          }
        />
        {events.length === 0 ? (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-10 h-10 rounded-full bg-surface-2 border border-border grid place-items-center mb-2">
              <InboxIcon className="w-4 h-4 text-muted" />
            </div>
            <p className="text-[12.5px] text-muted">Nothing here yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border -mx-1">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 px-1 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {!e.readAt && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  )}
                  <span
                    className={`text-[12.5px] truncate ${
                      e.readAt ? "text-muted" : "text-text"
                    }`}
                  >
                    {e.body}
                  </span>
                </div>
                <span className="text-[11px] text-muted shrink-0 tabular-nums">
                  {relativeTime(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
