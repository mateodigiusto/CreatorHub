"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  PencilLine,
  Save,
  X,
  Calendar as CalendarIcon,
  Sparkles,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAppState } from "@/lib/store";
import { useClientQuery } from "@/lib/clients/use-client-query";
import { cn } from "@/lib/cn";

type KeyPoint = { title: string; body: string };

type ApiScript = {
  id: string;
  platform: string;
  format: string;
  title: string | null;
  hook: string | null;
  setup: string | null;
  key_points: KeyPoint[];
  cta: string | null;
  b_roll_notes: string | null;
  status: "draft" | "approved" | "used" | "archived";
  feedback: string | null;
  created_at: string;
  approved_at: string | null;
  linked_sequence_id: string | null;
};

const FORMAT_LABELS: Record<string, string> = {
  reel: "Reel",
  longform: "Long-form",
  vsl: "VSL",
  story_sequence: "Story sequence",
  email: "Email",
};

export default function ScriptDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const router = useRouter();
  const { showToast } = useAppState();
  const clientQ = useClientQuery();

  const [script, setScript] = useState<ApiScript | null>(null);
  const [draft, setDraft] = useState<ApiScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingHook, setEditingHook] = useState(false);
  const [editingSetup, setEditingSetup] = useState(false);
  const [editingCta, setEditingCta] = useState(false);
  const [editingBroll, setEditingBroll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  /* Schedule picker UI state — hoisted above early returns so the hook
     order stays stable across renders. */
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    /* yyyy-MM-dd for native date input. */
    return d.toISOString().slice(0, 10);
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/scripts/${id}${clientQ.q}`, { credentials: "include" });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json = (await res.json()) as { script: ApiScript };
      setScript(json.script);
      setDraft(json.script);
    } finally {
      setLoading(false);
    }
  }, [id, clientQ.q]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <>
        <PageHeader title="Loading…" description="Pulling your script." />
        <div className="h-72 rounded-[14px] bg-surface-2 border border-border animate-pulse" />
      </>
    );
  }
  if (!script || !draft) {
    return (
      <>
        <PageHeader
          title="Script not found"
          description="This script might have been deleted or doesn't belong to you."
        />
        <Button variant="outline" onClick={() => router.push("/scripts")}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to scripts
        </Button>
      </>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(script);
  const isFinal = script.status === "approved" || script.status === "used";

  async function patch(fields: Partial<ApiScript>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/scripts/${id}${clientQ.q}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(toApiPatch(fields)),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(`Couldn't save: ${err.error ?? res.status}`);
        return;
      }
      const json = (await res.json()) as { script: ApiScript };
      setScript(json.script);
      setDraft(json.script);
    } catch {
      showToast("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAllEdits() {
    if (!dirty || saving || !draft) return;
    await patch(draft);
    setEditingHook(false);
    setEditingSetup(false);
    setEditingCta(false);
    setEditingBroll(false);
    showToast("Script saved");
  }

  function cancelEdits() {
    if (!script) return;
    setDraft(script);
    setEditingHook(false);
    setEditingSetup(false);
    setEditingCta(false);
    setEditingBroll(false);
  }

  async function approve(opts?: { scheduledAt?: string | null }) {
    if (approving || isFinal) return;
    setApproving(true);
    setScheduleOpen(false);
    try {
      const res = await fetch(`/api/scripts/${id}/approve${clientQ.q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(opts ?? {}),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(`Couldn't approve: ${err.error ?? res.status}`);
        return;
      }
      showToast("Approved — added to Calendar as Script Ready.");
      await load();
    } catch {
      showToast("Network error. Try again.");
    } finally {
      setApproving(false);
    }
  }

  async function archive() {
    await patch({ status: "archived" });
    showToast("Archived.");
    router.push("/scripts");
  }

  function updateKeyPoint(idx: number, fields: Partial<KeyPoint>) {
    if (!draft) return;
    const next = draft.key_points.slice();
    next[idx] = { ...next[idx], ...fields };
    setDraft({ ...draft, key_points: next });
  }

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <button
              onClick={() => router.push("/scripts")}
              className="p-1 rounded-md hover:bg-surface-2 cursor-pointer text-muted hover:text-text"
              aria-label="Back to scripts"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span>{script.title ?? "Untitled script"}</span>
          </span>
        }
        description={
          <span className="inline-flex items-center gap-1.5 flex-wrap">
            <Badge tone={script.status === "approved" ? "accent" : script.status === "used" ? "green" : "neutral"}>
              {script.status}
            </Badge>
            <Badge tone="neutral">{FORMAT_LABELS[script.format] ?? script.format}</Badge>
            <Badge tone="neutral">{script.platform}</Badge>
            {script.linked_sequence_id && (
              <Badge tone="accent">
                <CalendarIcon className="w-3 h-3 inline mr-0.5" /> on Calendar
              </Badge>
            )}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {dirty ? (
              <>
                <Button variant="ghost" size="sm" onClick={cancelEdits} disabled={saving}>
                  <X className="w-3.5 h-3.5" /> Cancel
                </Button>
                <Button size="sm" onClick={saveAllEdits} disabled={saving}>
                  <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save changes"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/api/scripts/${id}/export-pdf${clientQ.q}`, "_blank")}
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={archive}
                  disabled={isFinal}
                >
                  Archive
                </Button>
                <div className="relative">
                  <Button
                    size="sm"
                    onClick={() => (isFinal ? undefined : setScheduleOpen((v) => !v))}
                    disabled={isFinal || approving}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isFinal ? "Approved" : approving ? "Approving…" : "Approve"}
                  </Button>
                  {scheduleOpen && !isFinal && (
                    <div
                      className="absolute right-0 top-9 z-30 w-[280px] rounded-[12px] border border-border bg-surface shadow-[var(--shadow-card)] p-3.5"
                    >
                      <div className="text-[10.5px] uppercase font-semibold text-muted mb-1.5" style={{ letterSpacing: "0.06em" }}>
                        Schedule for
                      </div>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-md bg-surface-2 border border-border text-[13px] text-text focus:outline-none focus:border-accent/40"
                        style={{ colorScheme: "light dark" }}
                      />
                      <div className="flex items-center gap-1.5 mt-3">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => approve({ scheduledAt: new Date(scheduleDate).toISOString() })}
                          disabled={approving}
                        >
                          Schedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approve()}
                          disabled={approving}
                        >
                          Skip date
                        </Button>
                      </div>
                      <div className="text-[11px] text-muted mt-2 leading-snug">
                        Scheduled scripts appear on Calendar. Skip to keep
                        it as a draft until your editor picks a date.
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Hook */}
          <SectionCard
            title="Hook"
            subtitle="0–3 seconds. The thing that earns the rest of the video."
            editing={editingHook}
            onEdit={() => setEditingHook(true)}
            value={draft.hook}
            onChange={(v) => setDraft({ ...draft, hook: v })}
            placeholder="Bold transformation claim, counter-intuitive premise, or specific number…"
            rows={3}
          />

          {/* Setup */}
          <SectionCard
            title="Setup"
            subtitle="Bridges the hook into the body. Why should they keep watching?"
            editing={editingSetup}
            onEdit={() => setEditingSetup(true)}
            value={draft.setup}
            onChange={(v) => setDraft({ ...draft, setup: v })}
            placeholder="Frame the stakes…"
            rows={4}
          />

          {/* Key points */}
          <Card>
            <CardHeader title="Key points" description="The body of the script. Each block is one beat." />
            <div className="space-y-3.5">
              {draft.key_points.length === 0 && (
                <div className="text-[13px] text-muted italic">No key points yet.</div>
              )}
              {draft.key_points.map((kp, idx) => (
                <div key={idx} className="border border-border rounded-[10px] p-3.5 bg-surface-2">
                  <input
                    value={kp.title}
                    onChange={(e) => updateKeyPoint(idx, { title: e.target.value })}
                    placeholder="Beat title"
                    className="w-full text-[13.5px] font-semibold text-text bg-transparent border-0 p-0 focus:outline-none"
                  />
                  <textarea
                    value={kp.body}
                    onChange={(e) => updateKeyPoint(idx, { body: e.target.value })}
                    rows={3}
                    placeholder="What you'll say or show during this beat…"
                    className="w-full mt-1.5 text-[13px] text-text bg-transparent border-0 p-0 resize-y focus:outline-none leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* CTA */}
          <SectionCard
            title="Call to action"
            subtitle="The single ask. Save / share / DM / book."
            editing={editingCta}
            onEdit={() => setEditingCta(true)}
            value={draft.cta}
            onChange={(v) => setDraft({ ...draft, cta: v })}
            placeholder="Reply with the word X / Save this for next week / Book a call…"
            rows={3}
          />

          {/* B-roll notes */}
          <SectionCard
            title="B-roll notes"
            subtitle="What visuals to capture or pull. Optional but improves retention."
            editing={editingBroll}
            onEdit={() => setEditingBroll(true)}
            value={draft.b_roll_notes}
            onChange={(v) => setDraft({ ...draft, b_roll_notes: v })}
            placeholder="Camera-locked face for the rule reveal, side-by-side analytics screenshots…"
            rows={3}
          />
        </div>

        <div className="space-y-4">
          {/* Feedback */}
          <Card>
            <CardHeader
              title="Feedback"
              description="Notes the AI uses to improve future generations."
            />
            <textarea
              value={draft.feedback ?? ""}
              onChange={(e) => setDraft({ ...draft, feedback: e.target.value || null })}
              rows={4}
              placeholder="What worked, what didn't, what to do differently next time…"
              className="w-full text-[13px] text-text bg-surface-2 border border-border rounded-[10px] p-3 focus:outline-none focus:border-accent/40 leading-relaxed resize-y"
            />
          </Card>

          {/* Help */}
          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  How approval works
                </span>
              }
            />
            <ol className="text-[12.5px] text-muted leading-relaxed space-y-2 list-decimal pl-4">
              <li>Click <span className="text-text font-medium">Approve & schedule</span> to lock the script.</li>
              <li>We add it to your Calendar tagged <span className="text-text font-medium">Script Ready</span>.</li>
              <li>Your editor / VA picks it up there and moves it to <span className="text-text font-medium">Editing</span> in the Pipeline.</li>
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}

function SectionCard({
  title,
  subtitle,
  editing,
  onEdit,
  value,
  onChange,
  placeholder,
  rows,
}: {
  title: string;
  subtitle: string;
  editing: boolean;
  onEdit: () => void;
  value: string | null;
  onChange: (v: string) => void;
  placeholder: string;
  rows: number;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text">
            {title}
          </h3>
          <p className="text-[12.5px] text-muted mt-0.5 leading-snug">
            {subtitle}
          </p>
        </div>
        {!editing && (
          <button
            onClick={onEdit}
            className="text-[12px] text-muted hover:text-text inline-flex items-center gap-1 cursor-pointer shrink-0"
          >
            <PencilLine className="w-3 h-3" /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full text-[13.5px] text-text bg-surface-2 border border-border rounded-[10px] p-3 focus:outline-none focus:border-accent/40 leading-relaxed resize-y"
          autoFocus
        />
      ) : (
        <div
          className={cn(
            "text-[13.5px] leading-relaxed whitespace-pre-wrap",
            value ? "text-text" : "text-muted italic",
          )}
        >
          {value ?? placeholder}
        </div>
      )}
    </Card>
  );
}

/** API expects camelCase keys for PATCH. */
function toApiPatch(d: Partial<ApiScript>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (d.title !== undefined) out.title = d.title;
  if (d.hook !== undefined) out.hook = d.hook;
  if (d.setup !== undefined) out.setup = d.setup;
  if (d.cta !== undefined) out.cta = d.cta;
  if (d.b_roll_notes !== undefined) out.bRollNotes = d.b_roll_notes;
  if (d.feedback !== undefined) out.feedback = d.feedback;
  if (d.key_points !== undefined) out.keyPoints = d.key_points;
  if (d.status !== undefined) out.status = d.status;
  return out;
}
