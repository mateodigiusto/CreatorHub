"use client";

import { useSearchParams } from "next/navigation";
import { Sparkles, CircleDot } from "lucide-react";
import { FormatChip } from "@/components/team/bits";
import { useClients } from "@/lib/demo/clients";
import { useDemoTeam, type TaskStatus } from "@/lib/demo/team";

/* Client-friendly grouping — calm wording, no internal workflow jargon,
   no red/overdue states. Clients see progress, not pressure. */
const CLIENT_GROUP: { key: string; label: string; hint: string; statuses: TaskStatus[] }[] = [
  {
    key: "progress",
    label: "In progress",
    hint: "Being worked on right now",
    statuses: ["todo", "in_progress", "blocked"],
  },
  {
    key: "review",
    label: "Ready for your eyes",
    hint: "In review — almost there",
    statuses: ["in_review"],
  },
  {
    key: "delivered",
    label: "Delivered",
    hint: "Approved and shipped",
    statuses: ["done"],
  },
];

export function ClientPortalView() {
  const search = useSearchParams();
  const clientId = search.get("c") ?? "";
  const { clientById } = useClients();
  const { tasks } = useDemoTeam();

  const client = clientById(clientId);

  if (!client) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-[14px] bg-accent-soft grid place-items-center mx-auto mb-4">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <h1 className="text-[18px] font-semibold text-text">
            This portal link isn&apos;t active
          </h1>
          <p className="text-[13.5px] text-muted mt-1.5">
            Ask your team for an up-to-date link to see what&apos;s in progress.
          </p>
        </div>
      </div>
    );
  }

  const mine = tasks.filter((t) => t.client === client.name);
  const onboardDone = client.onboarding.filter((o) => o.done).length;
  const isOnboarding = client.status === "onboarding";

  return (
    <div className="min-h-screen">
      {/* header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[880px] mx-auto px-6 h-14 flex items-center gap-2.5">
          <span
            className="w-7 h-7 rounded-lg grid place-items-center text-white text-[12px] font-semibold"
            style={{ background: client.avatar }}
          >
            {client.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-[14px] font-semibold text-text">
            {client.name}
          </span>
          <span className="text-[12px] text-muted ml-auto">
            Client portal · powered by CreatorHub
          </span>
        </div>
      </header>

      <main className="max-w-[880px] mx-auto px-6 py-8">
        <h1 className="text-[24px] font-semibold text-text tracking-[-0.01em]">
          Here&apos;s what&apos;s in progress
        </h1>
        <p className="text-[14px] text-muted mt-1.5">
          A live look at the content we&apos;re making for you. No logins, no
          spreadsheets — just progress.
        </p>

        {isOnboarding && (
          <div className="mt-6 bg-accent-soft border border-accent-border rounded-[14px] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13.5px] font-semibold text-text">
                Getting you set up
              </span>
              <span className="text-[12px] text-accent font-medium">
                {onboardDone}/{client.onboarding.length} done
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{
                  width: `${(onboardDone / client.onboarding.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-7">
          {CLIENT_GROUP.map((group) => {
            const items = mine.filter((t) => group.statuses.includes(t.status));
            if (items.length === 0) return null;
            return (
              <section key={group.key}>
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="text-[14px] font-semibold text-text">
                    {group.label}
                  </h2>
                  <span className="text-[12px] text-muted">· {group.hint}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className="bg-surface border border-border rounded-[12px] p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FormatChip format={t.format} />
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted ml-auto">
                          <CircleDot className="w-3 h-3 text-accent" />
                          {group.label}
                        </span>
                      </div>
                      <div className="text-[13.5px] font-medium text-text leading-snug">
                        {t.title}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {mine.length === 0 && (
            <div className="bg-surface border border-border rounded-[14px] p-10 text-center">
              <p className="text-[14px] text-text font-medium">
                Nothing in progress just yet
              </p>
              <p className="text-[13px] text-muted mt-1">
                As soon as we start on your content, it&apos;ll show up here.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
