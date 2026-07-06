"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, LifeBuoy, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useDemoTeam } from "@/lib/demo/team";
import { RoleSwitcher } from "./RoleSwitcher";
import { MemberAvatar } from "./bits";

/**
 * The Editor Portal's own chrome — a deliberately calmer subset of CreatorHub.
 * No agency sidebar; just a slim top bar with the wordmark, the one nav item
 * an editor needs (My Tasks), the demo role switcher (so you can flip back to
 * Owner in one click), and the editor's identity.
 */
export function EditorPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me } = useDemoTeam();
  const onTasks = pathname === "/editor-portal";

  return (
    <div className="min-h-screen relative z-10 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/editor-portal" className="flex items-center gap-2 shrink-0">
            <span
              className="w-7 h-7 rounded-lg grid place-items-center text-white text-[13px] font-semibold"
              style={{ background: "linear-gradient(135deg,#14315E,#0B1F3A)" }}
            >
              C
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-text hidden sm:block">
              Creator<span className="text-accent">Hub</span>
            </span>
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft border border-accent-border px-2.5 py-1 text-[11.5px] font-medium text-accent">
            <Sparkles className="w-3 h-3" /> Editor Portal
          </span>

          <nav className="hidden sm:flex items-center gap-1 ml-2">
            <Link
              href="/editor-portal"
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[13px] font-medium transition-colors",
                onTasks
                  ? "bg-surface-2 text-text"
                  : "text-muted hover:text-text hover:bg-surface-2",
              )}
            >
              <ListChecks className="w-4 h-4" /> My Tasks
            </Link>
          </nav>

          <div className="flex-1" />

          <RoleSwitcher compact />

          {me && (
            <div className="hidden md:flex items-center gap-2">
              <MemberAvatar member={me} size={28} />
              <span className="text-[12.5px] font-medium text-text">
                {me.name}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      <footer className="border-t border-border">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between text-[11.5px] text-muted">
          <span>CreatorHub · Editor Portal</span>
          <a
            href="mailto:help@creatorhub.app"
            className="inline-flex items-center gap-1.5 hover:text-text transition-colors"
          >
            <LifeBuoy className="w-3.5 h-3.5" /> Help
          </a>
        </div>
      </footer>
    </div>
  );
}
