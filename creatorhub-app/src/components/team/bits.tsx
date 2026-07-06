"use client";

import {
  Film,
  Clapperboard,
  Palette,
  Music,
  Link2,
  PlaySquare,
  Camera,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  STATUS_LABEL,
  STATUS_TONE,
  PRIORITY_LABEL,
  type TaskStatus,
  type TaskPriority,
  type ResourceKind,
  type InspoPlatform,
  type Member,
} from "@/lib/demo/team";

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: "#94A3B8",
  medium: "#2563EB",
  high: "#DC2626",
};

export function PriorityChip({ priority }: { priority: TaskPriority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: PRIORITY_DOT[priority] }}
      />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function FormatChip({ format }: { format: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-2 border border-border px-2 py-[2px] text-[11px] font-medium text-text-2">
      {format}
    </span>
  );
}

export function ClientChip({ client }: { client: string }) {
  return (
    <span className="text-[11.5px] font-medium text-accent bg-accent-soft border border-accent-border rounded-full px-2 py-[2px]">
      {client}
    </span>
  );
}

export function MemberAvatar({
  member,
  size = 26,
}: {
  member: Member | undefined;
  size?: number;
}) {
  const initials = (member?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="rounded-full grid place-items-center text-white font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: member?.avatar ?? "linear-gradient(135deg,#94A3B8,#64748B)",
      }}
      title={member?.name}
    >
      {initials}
    </span>
  );
}

export const RESOURCE_ICON: Record<ResourceKind, LucideIcon> = {
  footage: Film,
  frameio: Clapperboard,
  brand: Palette,
  music: Music,
  other: Link2,
};

export const INSPO_ICON: Record<InspoPlatform, LucideIcon> = {
  youtube: PlaySquare,
  instagram: Camera,
  tiktok: Film,
  other: Link2,
};
