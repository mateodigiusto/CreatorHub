"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import type { NotificationKind } from "@/lib/clients/types";

type NotificationItem = {
  id: string;
  kind: NotificationKind;
  targetType: string | null;
  targetId: string | null;
  body: string | null;
  createdAt: string;
  readAt: string | null;
};

const POLL_MS = 30_000;

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { credentials: "include" });
      if (!r.ok) return;
      const json = (await r.json()) as {
        notifications: NotificationItem[];
        unreadCount: number;
      };
      setItems(json.notifications);
      setUnread(json.unreadCount);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
    const id = setInterval(() => {
      void load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  /* Close on outside-click. */
  useEffect(() => {
    if (!open) return;
    function onClickAnywhere(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onClickAnywhere);
    return () => window.removeEventListener("mousedown", onClickAnywhere);
  }, [open]);

  async function markAllRead() {
    /* Optimistic */
    setItems((prev) =>
      prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })),
    );
    setUnread(0);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
    } catch {
      void load();
    }
  }

  function targetHref(n: NotificationItem): string | null {
    if (n.targetType === "relationship" && n.targetId) {
      return `/clients/${n.targetId}`;
    }
    if (n.targetType === "task" && n.targetId) {
      /* The task → relationship lookup isn't cheap from the bell; fall back
         to /clients and let the user navigate. */
      return "/clients";
    }
    return null;
  }

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <IconButton
        aria-label="Notifications"
        title="Notifications"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="w-[15px] h-[15px]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-accent text-white text-[9px] font-bold tabular-nums grid place-items-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </IconButton>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[320px] max-h-[420px] rounded-[12px] border border-border bg-surface shadow-[var(--shadow-lift)] backdrop-blur-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-[12.5px] font-semibold text-text">
              Notifications
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-2 cursor-pointer font-medium"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-[12.5px] text-muted">
                Nothing yet.
              </div>
            ) : (
              items.map((n) => {
                const href = targetHref(n);
                const inner = (
                  <div
                    className={cn(
                      "px-3 py-2.5 border-b border-border last:border-b-0 transition-colors cursor-pointer",
                      !n.readAt ? "bg-accent-soft/30" : "hover:bg-surface-2",
                    )}
                  >
                    <div className="text-[12.5px] text-text leading-snug line-clamp-2">
                      {n.body ?? "Notification"}
                    </div>
                    <div className="text-[10.5px] text-muted mt-1 inline-flex items-center gap-1.5">
                      <span className="capitalize">{n.kind.replace("_", " ")}</span>
                      <span>·</span>
                      <span>{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                );
                return href ? (
                  <Link
                    key={n.id}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="block"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d`;
  return new Date(iso).toLocaleDateString();
}
