"use client";

import { useParams, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Ratio,
  Clock,
  Captions,
  FileVideo,
  AlertTriangle,
  Sparkles,
  Paperclip,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  useDemoTeam,
  dueLabel,
  timeAgo,
  STATUS_LABEL,
  STATUS_TONE,
  PRIORITY_LABEL,
  type ResourceKind,
  type InspoPlatform,
} from "@/lib/demo/team";
import { RESOURCE_ICON, INSPO_ICON } from "./bits";
import {
  decodeSnapshot,
  taskToSnapshot,
  type SharedTaskSnapshot,
} from "@/lib/demo/shareTask";

export function SharedTaskView() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const { tasks, memberById, ready } = useDemoTeam();

  // Prefer the snapshot baked into the link (works on any device); fall back
  // to a local lookup by id (your own browser, no payload).
  const encoded = search.get("d");
  let snap: SharedTaskSnapshot | null = encoded ? decodeSnapshot(encoded) : null;
  if (!snap && ready) {
    const t = tasks.find((x) => x.id === params.id);
    if (t) snap = taskToSnapshot(t, memberById(t.assigneeId)?.name ?? "Unassigned");
  }

  if (!snap) {
    if (!ready && !encoded) {
      return <div className="min-h-screen" />;
    }
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-[14px] bg-accent-soft grid place-items-center mx-auto mb-4">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <h1 className="text-[18px] font-semibold text-text">
            This task link isn&apos;t available
          </h1>
          <p className="text-[13.5px] text-muted mt-1.5">
            Ask whoever shared it for an up-to-date link.
          </p>
        </div>
      </div>
    );
  }

  const due = dueLabel(snap.dueDate);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[860px] mx-auto px-5 h-14 flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-accent-soft grid place-items-center">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </span>
          <span className="text-[14px] font-semibold text-text">Shared task</span>
          <span className="text-[12px] text-muted ml-auto">
            powered by CreatorHub
          </span>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-5 py-7">
        {/* Header card */}
        <section className="bg-surface border border-border rounded-[14px] p-5 mb-4">
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            <span className="text-[11.5px] font-medium text-accent bg-accent-soft border border-accent-border rounded-full px-2 py-[2px]">
              {snap.client}
            </span>
            <span className="inline-flex items-center rounded-full bg-surface-2 border border-border px-2 py-[2px] text-[11px] font-medium text-text-2">
              {snap.format}
            </span>
            <Badge tone={STATUS_TONE[snap.status]}>{STATUS_LABEL[snap.status]}</Badge>
          </div>
          <h1 className="text-[21px] font-semibold tracking-[-0.01em] text-text leading-snug">
            {snap.title}
          </h1>
          <div className="flex items-center gap-x-6 gap-y-2 flex-wrap mt-4 pt-4 border-t border-border">
            <Meta label="Assignee">
              <span className="text-[13px] text-text">{snap.assigneeName}</span>
            </Meta>
            <Meta label="Due">
              <span
                className={
                  due.overdue
                    ? "text-[13px] font-medium text-error"
                    : "text-[13px] text-text"
                }
              >
                {due.text}
              </span>
            </Meta>
            <Meta label="Priority">
              <span className="text-[13px] text-text">
                {PRIORITY_LABEL[snap.priority]}
              </span>
            </Meta>
          </div>
        </section>

        {snap.status === "blocked" && snap.blockerReason && (
          <section
            className="rounded-[14px] p-4 mb-4"
            style={{
              background: "rgba(217,119,6,0.06)",
              border: "1px solid rgba(217,119,6,0.22)",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="w-4 h-4" style={{ color: "var(--warning)" }} />
              <h3 className="text-[13.5px] font-semibold" style={{ color: "var(--warning)" }}>
                Blocked
              </h3>
            </div>
            <p className="text-[13px] text-text-2 leading-relaxed">
              {snap.blockerReason}
            </p>
          </section>
        )}

        {/* Brief */}
        <Section title="Brief & notes">
          <p className="text-[13.5px] text-text-2 leading-relaxed whitespace-pre-wrap">
            {snap.brief}
          </p>
        </Section>

        {/* Inspiration */}
        {snap.inspiration.length > 0 && (
          <Section title="Inspiration" subtitle="What we're going for">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {snap.inspiration.map((ins, i) => {
                const Icon = INSPO_ICON[(ins.platform as InspoPlatform)] ?? INSPO_ICON.other;
                return (
                  <a
                    key={i}
                    href={ins.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-[10px] border border-border bg-surface-2 px-3 py-2.5 hover:border-accent/40 transition-colors group"
                  >
                    <span className="w-8 h-8 rounded-lg bg-surface grid place-items-center text-accent shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-text truncate">
                        {ins.title}
                      </span>
                      <span className="block text-[11.5px] text-muted truncate">
                        {ins.url}
                      </span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted group-hover:text-accent shrink-0" />
                  </a>
                );
              })}
            </div>
          </Section>
        )}

        {/* Links & files */}
        {snap.resources.length > 0 && (
          <Section title="Links & files">
            <div className="flex flex-col divide-y divide-border">
              {snap.resources.map((r, i) => {
                const Icon = RESOURCE_ICON[(r.kind as ResourceKind)] ?? RESOURCE_ICON.other;
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="w-8 h-8 rounded-lg bg-surface-2 grid place-items-center text-text-2 shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-text">
                        {r.label}
                      </span>
                      <span className="block text-[11.5px] text-muted truncate">
                        {r.url}
                      </span>
                    </span>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 grid place-items-center rounded-md text-muted hover:text-accent hover:bg-surface-2 cursor-pointer shrink-0"
                      aria-label={`Open ${r.label}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Specs */}
        <Section title="Deliverable specs">
          <div className="flex items-center gap-2 flex-wrap">
            <Spec icon={<Ratio className="w-3.5 h-3.5" />} text={snap.specs.aspectRatio} />
            <Spec icon={<Clock className="w-3.5 h-3.5" />} text={snap.specs.targetLength} />
            <Spec
              icon={<Captions className="w-3.5 h-3.5" />}
              text={snap.specs.captions ? "Captions on" : "No captions"}
            />
            <Spec icon={<FileVideo className="w-3.5 h-3.5" />} text={snap.specs.exportFormat} />
          </div>
        </Section>

        {/* Deliverable */}
        {snap.deliverableUrl && (
          <Section title="Deliverable">
            <a
              href={snap.deliverableUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] text-accent hover:underline"
            >
              <Paperclip className="w-3.5 h-3.5" /> {snap.deliverableUrl}
            </a>
          </Section>
        )}

        {/* Activity (read-only) */}
        {snap.comments.length > 0 && (
          <Section title="Activity">
            <div className="flex flex-col gap-3">
              {snap.comments.map((c, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-text">
                      {c.authorName}
                    </span>
                    <span className="text-[11px] text-muted">{timeAgo(c.at)}</span>
                  </div>
                  <p className="text-[13px] text-text-2 mt-0.5 leading-relaxed">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        <p className="text-[11.5px] text-muted text-center mt-6">
          You&apos;re viewing a read-only shared task.
        </p>
      </main>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider font-semibold text-muted mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border border-border rounded-[14px] p-5 mb-4">
      <div className="mb-3">
        <h2 className="text-[14px] font-semibold text-text">{title}</h2>
        {subtitle && <p className="text-[12px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Spec({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-2 border border-border px-2.5 py-1.5 text-[12px] text-text-2">
      <span className="text-muted">{icon}</span>
      {text}
    </span>
  );
}
