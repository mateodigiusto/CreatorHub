"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Lightbulb,
  FileText,
  Calendar,
  FileBarChart,
  Settings,
  Plug,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";
import { StatusDot } from "@/components/ui/StatusDot";

const main = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/reports", label: "Reports", icon: FileBarChart },
];

const secondary = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/help", label: "Help", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { connected } = useAppState();
  return (
    <aside
      className="w-[244px] shrink-0 text-white/90 flex flex-col h-screen sticky top-0 border-r border-white/[0.04]"
      style={{
        background:
          "linear-gradient(180deg, #0B1220 0%, #070B14 100%)",
      }}
    >
      <div className="px-5 h-16 flex items-center border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg grid place-items-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(37,99,235,0.45), rgba(99,102,241,0.30))",
              border: "1px solid rgba(96,165,250,0.45)",
            }}
          >
            <span className="text-[13px] font-semibold" style={{ color: "#BFDBFE" }}>C</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            Creator<span style={{ color: "#BFDBFE" }}>Hub</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 flex flex-col">
        <SectionLabel
          right={
            connected ? (
              <span
                className="flex items-center gap-1.5 text-[10px] normal-case tracking-normal"
                style={{ color: "#93C5FD" }}
              >
                <StatusDot tone="accent" size={5} /> Live
              </span>
            ) : null
          }
        >
          Workspace
        </SectionLabel>
        <ul className="space-y-0.5 mb-6">
          {main.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              active={pathname === item.href}
            />
          ))}
        </ul>

        <SectionLabel>System</SectionLabel>
        <ul className="space-y-0.5">
          {secondary.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              active={pathname === item.href}
            />
          ))}
        </ul>
      </nav>

      <div className="px-3 pb-4">
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3.5 hover:bg-white/[0.06] transition-colors">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full grid place-items-center text-white text-[12px] font-semibold"
              style={{
                background: "linear-gradient(135deg, #2563EB, #6366F1)",
              }}
            >
              MG
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-white truncate">
                Mateo Garcia
              </div>
              <div className="text-[11.5px] text-white/50 truncate">
                Pro · Single workspace
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({
  children,
  right,
}: {
  children: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.08em] text-white/40 px-3 mb-2 font-medium">
      <span>{children}</span>
      {right}
    </div>
  );
}

function NavItem({
  item,
  active,
}: {
  item: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "relative flex items-center gap-2.5 h-9 pl-3 pr-3 rounded-[8px] text-[13.5px] transition-colors",
          active
            ? "bg-white/[0.07] text-white"
            : "text-white/65 hover:text-white hover:bg-white/[0.04]"
        )}
      >
        {active && (
          <span
            aria-hidden
            className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
            style={{
              background:
                "linear-gradient(180deg, #93C5FD 0%, #2563EB 100%)",
              boxShadow: "0 0 8px rgba(96,165,250,0.55)",
            }}
          />
        )}
        <Icon className="w-[16px] h-[16px]" />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}
