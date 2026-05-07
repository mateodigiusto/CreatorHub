"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ActingAsBanner } from "./ActingAsBanner";
import { Aurora } from "./Aurora";
import { MouseGlow } from "./MouseGlow";
import { Toaster } from "@/components/ui/Toaster";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isOnboarding = pathname?.startsWith("/onboarding");
  const isLogin = pathname === "/login";
  const isPublicStandalone =
    pathname === "/data-deletion-status" ||
    pathname === "/terms" ||
    pathname === "/privacy";
  const isFullViewport = isOnboarding || isLogin || isPublicStandalone;

  /* Close mobile drawer on route change. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileNavOpen(false);
  }, [pathname]);

  /* Lock body scroll when mobile drawer is open. */
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileNavOpen]);

  if (isFullViewport) {
    return (
      <div className="min-h-screen relative">
        <Aurora />
        <MouseGlow />
        {children}
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative">
      <Aurora />
      <MouseGlow />
      <div className="relative z-10 flex w-full">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
          <ActingAsBanner />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
