/**
 * `/workspace/overview` — landing page for the creator inside their
 * agency-owned workspace.
 *
 * Read-only: 4 callout cards linking to the meaningful tabs + a
 * "what's next" summary pulled from `brand_profiles.next_steps_goal`
 * (Strategy field). If the brand profile row doesn't exist yet, render
 * an empty state pointing to Brand Build.
 */

import Link from "next/link";
import {
  CalendarClock,
  FileText,
  Sparkles,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  {
    href: "/workspace/brand-build",
    icon: FileText,
    title: "Brand Build",
    blurb: "Mission, voice, audience, and the rules of your brand.",
  },
  {
    href: "/workspace/strategy",
    icon: Target,
    title: "Strategy",
    blurb: "What we're focused on for the next 30 days.",
  },
  {
    href: "/workspace/pipeline",
    icon: Sparkles,
    title: "Pipeline",
    blurb: "Every piece of content, from idea to posted.",
  },
  {
    href: "/workspace/calendar",
    icon: CalendarClock,
    title: "Calendar",
    blurb: "When everything is scheduled to go live.",
  },
] as const;

export default async function WorkspaceOverviewPage() {
  const viewer = await requireWorkspaceAccess();
  const supabase = await getSupabaseServer();

  // `brand_profiles` lives in 0035_client_workspace.sql which Phase 3
  // owns. The Supabase generated types haven't been regenerated against
  // that migration yet, so we cast through `unknown`. Once Phase 3
  // ships and `npm run db:types` is rerun, drop the cast.
  const { data: brandRaw } = await supabase
    .from("brand_profiles" as never)
    .select(
      "bio, mission, voice, next_steps_goal, next_steps_focus, updated_at",
    )
    .eq("client_id", viewer.client.id)
    .maybeSingle();
  const brand = brandRaw as {
    bio: string | null;
    mission: string | null;
    voice: string | null;
    next_steps_goal: string | null;
    next_steps_focus: string | null;
    updated_at: string;
  } | null;

  const goal = brand?.next_steps_goal?.trim() ?? null;
  const focus = brand?.next_steps_focus?.trim() ?? null;
  const bio = brand?.bio?.trim() ?? null;

  return (
    <div className="p-6">
      <PageHeader
        title={`Welcome back, ${viewer.client.displayName}`}
        description="A snapshot of where things stand and what's coming up."
      />

      {goal || focus ? (
        <Card className="mb-6 border-accent/30 bg-accent-soft">
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-accent">
            Next 30 days
          </p>
          {goal && (
            <p className="text-[15px] font-medium leading-snug tracking-[-0.005em] text-text">
              {goal}
            </p>
          )}
          {focus && (
            <p className="mt-2 text-[13px] leading-relaxed text-text-2">
              <span className="font-semibold text-text">Focus:</span> {focus}
            </p>
          )}
          <Link
            href="/workspace/strategy"
            className="mt-3 inline-block text-[12.5px] font-medium text-accent hover:underline"
          >
            See full strategy →
          </Link>
        </Card>
      ) : (
        <Card className="mb-6">
          <p className="text-[13.5px] text-muted">
            No strategy notes yet. Your team will publish a 30-day plan on
            the{" "}
            <Link
              href="/workspace/strategy"
              className="font-medium text-accent hover:underline"
            >
              Strategy
            </Link>{" "}
            tab once it&apos;s ready.
          </p>
        </Card>
      )}

      {bio && (
        <Card className="mb-6">
          <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
            Bio
          </p>
          <p className="text-[14px] leading-relaxed text-text-2">{bio}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUICK_LINKS.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.href} href={q.href}>
              <Card lift className="h-full">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-[14.5px] font-semibold tracking-[-0.005em] text-text">
                  {q.title}
                </h3>
                <p className="mt-1 text-[13px] leading-snug text-muted">
                  {q.blurb}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
