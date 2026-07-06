"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Link2,
  Copy,
  Check,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAppState } from "@/lib/store";
import { MemberAvatar } from "@/components/team/bits";
import {
  useDemoTeam,
  ROLE_LABEL,
  type DemoRole,
  type MemberRole,
} from "@/lib/demo/team";
import { cn } from "@/lib/cn";

const ROLE_TONE: Record<MemberRole, "navy" | "accent" | "blue" | "neutral" | "amber"> = {
  owner: "navy",
  admin: "accent",
  manager: "blue",
  editor: "neutral",
  pending: "amber",
};

/* Demo invite link — a fake token with the role baked in. */
function fakeToken(role: DemoRole): string {
  const prefix = role === "editor" ? "ed" : role === "manager" ? "mg" : "ad";
  return `${prefix}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function TeamPage() {
  const { members, role, setMemberRole, removeMember } = useDemoTeam();
  const { showToast } = useAppState();
  const [inviteRole, setInviteRole] = useState<DemoRole>("editor");
  /* Token + origin are generated client-side only — Math.random and
     window.location would mismatch the server-rendered HTML otherwise. */
  const [token, setToken] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setToken(fakeToken("editor"));
    setOrigin(window.location.origin);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const canManageRoles = role === "owner" || role === "admin";

  const link = useMemo(
    () => (token ? `${origin}/join?token=${token}` : "Generating link…"),
    [origin, token],
  );

  function regen(r: DemoRole) {
    setInviteRole(r);
    setToken(fakeToken(r));
    setCopied(false);
  }

  function copyLink() {
    if (!token) return;
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      showToast("Invite link copied");
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const activeMembers = members.filter((m) => m.role !== "pending");
  const pendingMembers = members.filter((m) => m.role === "pending");

  return (
    <>
      <PageHeader
        title="Team"
        description="Invite collaborators, assign roles, and control who sees what."
      />

      {/* Invite via link */}
      <Card className="mb-5">
        <CardHeader
          title="Invite via link"
          description="Share a link — no sign-in needed for the demo. The role is baked into the link."
        />
        <div className="flex items-center gap-1.5 mb-3">
          {(["editor", "manager", "admin"] as DemoRole[]).map((r) => (
            <button
              key={r}
              onClick={() => regen(r)}
              className={cn(
                "h-8 px-3 rounded-full text-[12.5px] font-medium border transition-colors cursor-pointer",
                inviteRole === r
                  ? "bg-accent-soft border-accent-border text-accent"
                  : "bg-surface border-border text-muted hover:text-text",
              )}
            >
              {ROLE_LABEL[r]} link
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 h-10 rounded-[10px] border border-border bg-surface-2 px-3 min-w-0">
            <Link2 className="w-4 h-4 text-muted shrink-0" />
            <span className="text-[13px] text-text-2 truncate">{link}</span>
          </div>
          <Button onClick={copyLink}>
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy link
              </>
            )}
          </Button>
        </div>
        <p className="text-[12px] text-muted mt-2.5">
          Opening this link drops the invitee straight into the{" "}
          {ROLE_LABEL[inviteRole]} experience.
        </p>
      </Card>

      {/* Pending */}
      {pendingMembers.length > 0 && (
        <Card className="mb-5">
          <CardHeader
            title="Pending invites"
            description="Joined via link — assign a role to give them access."
          />
          <div className="flex flex-col divide-y divide-border">
            {pendingMembers.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <MemberAvatar member={m} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium text-text">
                    {m.name}
                  </div>
                  <div className="text-[12px] text-muted">
                    Joined via link · awaiting role
                  </div>
                </div>
                <Badge tone="amber">Pending</Badge>
                {canManageRoles ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMemberRole(m.id, "editor");
                        showToast(`${m.name} is now an Editor`);
                      }}
                    >
                      Make Editor
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        removeMember(m.id);
                        showToast(`Removed ${m.name}`);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-[12px] text-muted">View only</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Members */}
      <Card>
        <CardHeader
          title="Members"
          description={`${activeMembers.length} people in this workspace`}
          action={
            canManageRoles ? (
              <Badge tone="accent">
                <ShieldCheck className="w-3 h-3" /> You can manage roles
              </Badge>
            ) : (
              <Badge tone="neutral">View only</Badge>
            )
          }
        />
        <div className="flex flex-col divide-y divide-border">
          {activeMembers.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              canManage={canManageRoles}
              onRole={(r) => {
                setMemberRole(m.id, r);
                showToast(`${m.name} is now ${ROLE_LABEL[r]}`);
              }}
              onRemove={() => {
                removeMember(m.id);
                showToast(`Removed ${m.name}`);
              }}
            />
          ))}
        </div>
      </Card>
    </>
  );
}

const PROMOTE: Partial<Record<MemberRole, DemoRole>> = {
  editor: "manager",
  manager: "admin",
};
const DEMOTE: Partial<Record<MemberRole, DemoRole>> = {
  admin: "manager",
  manager: "editor",
};

function MemberRow({
  member,
  canManage,
  onRole,
  onRemove,
}: {
  member: { id: string; name: string; role: MemberRole; joinedViaLink?: boolean; avatar: string };
  canManage: boolean;
  onRole: (r: DemoRole) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isOwner = member.role === "owner";
  const promote = PROMOTE[member.role];
  const demote = DEMOTE[member.role];

  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <MemberAvatar member={member} size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-medium text-text">
            {member.name}
          </span>
          {member.joinedViaLink && (
            <span className="text-[11px] text-muted">· joined via link</span>
          )}
        </div>
        <div className="text-[12px] text-muted">
          {member.role === "editor"
            ? "Sees the Editor Portal only"
            : member.role === "manager"
              ? "Full app + production"
              : "Full app + manage roles"}
        </div>
      </div>

      <Badge tone={ROLE_TONE[member.role]}>{ROLE_LABEL[member.role]}</Badge>

      {canManage && !isOwner ? (
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            className="w-8 h-8 grid place-items-center rounded-md text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
            aria-label="Member actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {open && (
            <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-[180px] rounded-[10px] bg-surface border border-border shadow-[0_12px_32px_-8px_rgba(7,17,31,0.22)] py-1">
              {promote && (
                <MenuItem
                  icon={<ArrowUp className="w-3.5 h-3.5" />}
                  onClick={() => onRole(promote)}
                >
                  Promote to {ROLE_LABEL[promote]}
                </MenuItem>
              )}
              {demote && (
                <MenuItem
                  icon={<ArrowDown className="w-3.5 h-3.5" />}
                  onClick={() => onRole(demote)}
                >
                  Demote to {ROLE_LABEL[demote]}
                </MenuItem>
              )}
              <MenuItem
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={onRemove}
                danger
              >
                Remove
              </MenuItem>
            </div>
          )}
        </div>
      ) : (
        <span className="w-8" />
      )}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-[12.5px] cursor-pointer hover:bg-surface-2 text-left",
        danger ? "text-error" : "text-text",
      )}
    >
      <span className={danger ? "text-error" : "text-muted"}>{icon}</span>
      {children}
    </button>
  );
}
