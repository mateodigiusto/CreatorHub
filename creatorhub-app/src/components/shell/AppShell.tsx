import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Aurora } from "./Aurora";
import { MouseGlow } from "./MouseGlow";
import { Toaster } from "@/components/ui/Toaster";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex relative">
      <Aurora />
      <MouseGlow />
      <div className="relative z-10 flex w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 px-8 py-6 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
