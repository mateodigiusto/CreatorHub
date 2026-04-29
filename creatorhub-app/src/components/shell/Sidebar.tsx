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
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const workspace: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
];

const tools: NavItem[] = [
  { href: "/sequence-studio", label: "Sequence Studio", icon: Wand2 },
  { href: "/reports", label: "Reports", icon: FileBarChart },
];

const system: NavItem[] = [
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

type Tokens = {
  gradTop: string;
  gradMid: string;
  gradBot: string;
  glowColor: string;
  glowColor2: string;
  innerHighlight: string;
  borderRight: string;
  borderHair: string;
  labelColor: string;
  wordColor: string;
  markColor: string;
  markBg: string;
  markBorder: string;
  wordAccent: string;
  liveColor: string;
  liveDot: string;
  liveDotShadow: string;
  itemRest: string;
  itemActiveBg: string;
  itemHoverBg: string;
  activeBar: string;
  activeBarShadow: string;
  userCardBg: string;
  userCardBorder: string;
  userAvatar: string;
  userName: string;
  userMeta: string;
};

const lightTokens: Tokens = {
  gradTop: "#0A1729",
  gradMid: "#06101F",
  gradBot: "#030813",
  glowColor: "rgba(20,49,94,0.40)",
  glowColor2: "rgba(11,31,58,0.30)",
  innerHighlight: "rgba(255,255,255,0.04)",
  borderRight: "rgba(255,255,255,0.04)",
  borderHair: "rgba(255,255,255,0.06)",
  labelColor: "rgba(255,255,255,0.40)",
  wordColor: "#fff",
  markColor: "#A8C5FF",
  markBg: "linear-gradient(135deg, rgba(20,49,94,0.85), rgba(11,31,58,0.70))",
  markBorder: "rgba(93,169,233,0.30)",
  wordAccent: "#A8C5FF",
  liveColor: "#A8C5FF",
  liveDot: "#5DA9E9",
  liveDotShadow: "0 0 5px rgba(93,169,233,0.55)",
  itemRest: "rgba(255,255,255,0.62)",
  itemActiveBg: "rgba(255,255,255,0.06)",
  itemHoverBg: "rgba(255,255,255,0.04)",
  activeBar: "linear-gradient(180deg,#5DA9E9,#1B4FD4)",
  activeBarShadow: "0 0 6px rgba(27,79,212,0.45)",
  userCardBg: "rgba(255,255,255,0.04)",
  userCardBorder: "rgba(255,255,255,0.06)",
  userAvatar: "linear-gradient(135deg, #14315E, #0B1F3A)",
  userName: "#fff",
  userMeta: "rgba(255,255,255,0.45)",
};

const darkTokens: Tokens = {
  gradTop: "#1A1A20",
  gradMid: "#101014",
  gradBot: "#070709",
  glowColor: "rgba(84,129,234,0.28)",
  glowColor2: "rgba(127,190,239,0.14)",
  innerHighlight: "rgba(255,255,255,0.06)",
  borderRight: "rgba(255,255,255,0.06)",
  borderHair: "rgba(255,255,255,0.06)",
  labelColor: "rgba(255,255,255,0.40)",
  wordColor: "#F4F4F5",
  markColor: "#A8C5FF",
  markBg: "linear-gradient(135deg, rgba(59,111,230,0.40), rgba(59,111,230,0.18))",
  markBorder: "rgba(84,129,234,0.35)",
  wordAccent: "#A8C5FF",
  liveColor: "#A8C5FF",
  liveDot: "#3B6FE6",
  liveDotShadow: "0 0 6px rgba(59,111,230,0.85)",
  itemRest: "rgba(255,255,255,0.65)",
  itemActiveBg: "rgba(255,255,255,0.06)",
  itemHoverBg: "rgba(255,255,255,0.04)",
  activeBar: "linear-gradient(180deg,#5481EA,#3B6FE6)",
  activeBarShadow: "0 0 8px rgba(84,129,234,0.55)",
  userCardBg: "rgba(255,255,255,0.04)",
  userCardBorder: "rgba(255,255,255,0.06)",
  userAvatar: "linear-gradient(135deg, #3B6FE6, #5481EA)",
  userName: "#fff",
  userMeta: "rgba(255,255,255,0.45)",
};

export function Sidebar() {
  const pathname = usePathname();
  const { connected, theme } = useAppState();
  const t = theme === "dark" ? darkTokens : lightTokens;

  return (
    <aside
      className="w-[244px] shrink-0 h-screen sticky top-0 flex flex-col text-white/90 relative overflow-hidden"
      style={{
        background: `
          radial-gradient(140% 60% at 0% 0%, ${t.glowColor} 0%, transparent 50%),
          radial-gradient(100% 50% at 100% 100%, ${t.glowColor2} 0%, transparent 60%),
          linear-gradient(180deg, ${t.gradTop} 0%, ${t.gradMid} 50%, ${t.gradBot} 100%)
        `,
        borderRight: `1px solid ${t.borderRight}`,
        boxShadow: `inset -1px 0 0 ${t.innerHighlight}`,
        padding: "16px 12px",
      }}
    >
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          top: -60,
          left: -40,
          width: 280,
          height: 220,
          background: `radial-gradient(closest-side, ${t.glowColor} 0%, transparent 75%)`,
          filter: "blur(20px)",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          bottom: -40,
          right: -40,
          width: 240,
          height: 200,
          background: `radial-gradient(closest-side, ${t.glowColor2} 0%, transparent 75%)`,
          filter: "blur(20px)",
          zIndex: 0,
        }}
      />

      <div className="relative z-[1] flex flex-col flex-1 min-h-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-2 pb-4"
          style={{ borderBottom: `1px solid ${t.borderHair}` }}
        >
          <div
            className="w-7 h-7 rounded-lg grid place-items-center text-[13px] font-semibold"
            style={{
              color: t.markColor,
              background: t.markBg,
              border: `1px solid ${t.markBorder}`,
            }}
          >
            C
          </div>
          <span
            className="text-[15px] font-semibold tracking-tight"
            style={{ color: t.wordColor }}
          >
            Creator<span style={{ color: t.wordAccent }}>Hub</span>
          </span>
        </Link>

        <SidebarLabel color={t.labelColor}>
          Workspace
          {connected && (
            <Live
              color={t.liveColor}
              dot={t.liveDot}
              shadow={t.liveDotShadow}
            />
          )}
        </SidebarLabel>
        <SidebarList items={workspace} active={pathname} tokens={t} />

        <SidebarLabel color={t.labelColor}>Tools</SidebarLabel>
        <SidebarList items={tools} active={pathname} tokens={t} />

        <div className="flex-1" />

        <div
          className="mt-2 pt-3"
          style={{ borderTop: `1px solid ${t.borderHair}` }}
        >
          <SidebarLabel color={t.labelColor}>System</SidebarLabel>
          <SidebarList items={system} active={pathname} tokens={t} compact />
        </div>

        <div
          className="mt-2.5 mx-1 p-3 rounded-[10px] flex items-center gap-2.5"
          style={{
            background: t.userCardBg,
            border: `1px solid ${t.userCardBorder}`,
          }}
        >
          <div
            className="w-[30px] h-[30px] rounded-lg grid place-items-center text-white text-[12px] font-semibold"
            style={{ background: t.userAvatar }}
          >
            EM
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[12.5px] font-medium truncate"
              style={{ color: t.userName }}
            >
              Ella Moreno
            </div>
            <div className="text-[11px]" style={{ color: t.userMeta }}>
              Pro plan · 2 seats
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarLabel({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="flex items-center justify-between text-[10.5px] uppercase font-medium px-3 pt-4 pb-1.5"
      style={{ color, letterSpacing: "0.08em" }}
    >
      {children}
    </div>
  );
}

function Live({
  color,
  dot,
  shadow,
}: {
  color: string;
  dot: string;
  shadow: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] normal-case"
      style={{ color, letterSpacing: 0 }}
    >
      <span
        className="inline-block w-[5px] h-[5px] rounded-full"
        style={{ background: dot, boxShadow: shadow }}
      />
      Live
    </span>
  );
}

function SidebarList({
  items,
  active,
  tokens,
  compact = false,
}: {
  items: NavItem[];
  active: string;
  tokens: Tokens;
  compact?: boolean;
}) {
  return (
    <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
      {items.map((it) => {
        const isActive = it.href === active;
        const Icon = it.icon;
        const restColor = compact
          ? "rgba(255,255,255,0.50)"
          : tokens.itemRest;
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              className={cn(
                "relative flex items-center gap-2.5 px-2.5 rounded-[8px] transition-colors",
                compact
                  ? "h-7 text-[12.5px]"
                  : "h-8 text-[13px]"
              )}
              style={{
                color: isActive ? "#fff" : restColor,
                background: isActive ? tokens.itemActiveBg : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = tokens.itemHoverBg;
                  e.currentTarget.style.color = "rgba(255,255,255,0.80)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = restColor;
                }
              }}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-[2px]"
                  style={{
                    background: tokens.activeBar,
                    boxShadow: tokens.activeBarShadow,
                  }}
                />
              )}
              <Icon className={compact ? "w-3.5 h-3.5" : "w-[15px] h-[15px]"} />
              <span>{it.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
