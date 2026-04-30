"use client";

/**
 * Topbar account control. Two states:
 *
 *   Logged out → "Sign in" button → /login
 *   Logged in  → avatar + dropdown with email + Sign out
 *
 * Uses the browser Supabase client to subscribe to auth state changes,
 * so signing in/out updates this component live without a full reload.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/cn";

export function AuthMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (loading) {
    /* Prevent CLS — render a same-size skeleton until we know the auth state. */
    return <div className="w-[88px] h-7 rounded-md bg-surface-2 animate-pulse" />;
  }

  if (!user) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          window.location.href = "/login";
        }}
      >
        Sign in
      </Button>
    );
  }

  const initials = (user.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-7 pl-1 pr-1.5 rounded-full hover:bg-surface-2 transition-colors cursor-pointer"
        aria-label="Account menu"
      >
        <span
          className="w-6 h-6 rounded-full grid place-items-center text-[11px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #14315E, #0B1F3A)" }}
        >
          {initials}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[34px] z-50 w-[260px] rounded-[12px] bg-surface border border-border shadow-[0_12px_32px_-8px_rgba(7,17,31,0.18)] py-2">
          <div className="px-3 py-2 border-b border-border mb-1">
            <div className="text-[11.5px] uppercase font-semibold text-muted tracking-wider mb-0.5">
              Signed in as
            </div>
            <div className="text-[13px] text-text font-medium truncate">
              {user.email}
            </div>
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-text hover:bg-surface-2 cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <UserIcon className="w-3.5 h-3.5 text-muted" />
            Account & settings
          </Link>

          <form action="/api/auth/sign-out" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-text hover:bg-surface-2 cursor-pointer text-left"
            >
              <LogOut className="w-3.5 h-3.5 text-muted" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
