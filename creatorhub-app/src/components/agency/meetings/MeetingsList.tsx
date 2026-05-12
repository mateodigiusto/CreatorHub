"use client";

/**
 * Meetings tab — list of meeting_notes for a client. Each row is
 * collapsible into edit mode. Visibility flag controls whether the client
 * portal sees it.
 */

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { MeetingNote, Visibility } from "@/lib/agency/assets-types";

type Props = { slug: string };

export function MeetingsList({ slug }: Props) {
  const [meetings, setMeetings] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/clients/${slug}/meetings`, {
      cache: "no-store",
    });
    if (res.ok) {
      const body = (await res.json()) as { meetings: MeetingNote[] };
      setMeetings(body.meetings);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="w-3.5 h-3.5" />
          Add meeting
        </Button>
      </div>

      {adding && (
        <MeetingEditCard
          slug={slug}
          onDone={() => {
            setAdding(false);
            void load();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {loading ? (
        <Card>
          <p className="text-[13px] text-muted">Loading…</p>
        </Card>
      ) : meetings.length === 0 && !adding ? (
        <EmptyState
          title="No meetings logged"
          description="Capture decisions, action items, and attendees so nothing slips."
          primaryAction={{
            label: "Add meeting",
            onClick: () => setAdding(true),
          }}
          showSampleDataCta={false}
        />
      ) : (
        meetings.map((m) =>
          openId === m.id ? (
            <MeetingEditCard
              key={m.id}
              slug={slug}
              existing={m}
              onDone={() => {
                setOpenId(null);
                void load();
              }}
              onCancel={() => setOpenId(null)}
            />
          ) : (
            <MeetingRow
              key={m.id}
              meeting={m}
              onEdit={() => setOpenId(m.id)}
              onDeleted={load}
              slug={slug}
            />
          ),
        )
      )}
    </div>
  );
}

function MeetingRow({
  meeting,
  onEdit,
  onDeleted,
  slug,
}: {
  meeting: MeetingNote;
  onEdit: () => void;
  onDeleted: () => void;
  slug: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11.5px] text-muted tabular-nums">
              {meeting.meetingDate}
            </span>
            <Badge
              tone={
                meeting.visibility === "client_visible" ? "accent" : "neutral"
              }
            >
              {meeting.visibility === "client_visible" ? "Client" : "Internal"}
            </Badge>
          </div>
          <h3 className="text-[15px] font-semibold text-text">
            {meeting.title}
          </h3>
          {meeting.attendees && (
            <p className="text-[12.5px] text-muted mt-1">
              Attendees: {meeting.attendees}
            </p>
          )}
          {meeting.body && (
            <p className="text-[13px] text-text mt-2 whitespace-pre-wrap">
              {meeting.body}
            </p>
          )}
          {meeting.actionItems && (
            <div className="mt-3">
              <h4 className="text-[11.5px] font-medium uppercase tracking-wide text-muted mb-1">
                Action items
              </h4>
              <p className="text-[13px] text-text whitespace-pre-wrap">
                {meeting.actionItems}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm("Delete this meeting?")) return;
              await fetch(`/api/clients/${slug}/meetings/${meeting.id}`, {
                method: "DELETE",
              });
              onDeleted();
            }}
            className="text-muted hover:text-[var(--error)] p-1.5"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function MeetingEditCard({
  slug,
  existing,
  onDone,
  onCancel,
}: {
  slug: string;
  existing?: MeetingNote;
  onDone: () => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [date, setDate] = useState(existing?.meetingDate ?? today);
  const [body, setBody] = useState(existing?.body ?? "");
  const [attendees, setAttendees] = useState(existing?.attendees ?? "");
  const [actionItems, setActionItems] = useState(existing?.actionItems ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    existing?.visibility ?? "internal",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Card>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setBusy(true);
          const payload = {
            title: title.trim(),
            meetingDate: date,
            body,
            attendees,
            actionItems,
            visibility,
          };
          const res = existing
            ? await fetch(`/api/clients/${slug}/meetings/${existing.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              })
            : await fetch(`/api/clients/${slug}/meetings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
          setBusy(false);
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setErr(j.error ?? "save_failed");
            return;
          }
          onDone();
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
          <input
            required
            placeholder="Title (e.g., Q2 kickoff)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-surface border border-border rounded px-2.5 py-2 text-[14px] outline-none focus:border-accent/40"
          />
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-surface border border-border rounded px-2.5 py-2 text-[13px] outline-none focus:border-accent/40"
            style={{ colorScheme: "light dark" }}
          />
        </div>
        <input
          placeholder="Attendees (comma-separated)"
          value={attendees ?? ""}
          onChange={(e) => setAttendees(e.target.value)}
          className="w-full bg-surface border border-border rounded px-2.5 py-2 text-[13px] outline-none focus:border-accent/40"
        />
        <textarea
          rows={4}
          placeholder="Discussion notes…"
          value={body ?? ""}
          onChange={(e) => setBody(e.target.value)}
          className="w-full bg-surface border border-border rounded px-2.5 py-2 text-[13px] outline-none focus:border-accent/40 resize-y"
        />
        <textarea
          rows={3}
          placeholder="Action items…"
          value={actionItems ?? ""}
          onChange={(e) => setActionItems(e.target.value)}
          className="w-full bg-surface border border-border rounded px-2.5 py-2 text-[13px] outline-none focus:border-accent/40 resize-y"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="bg-surface border border-border rounded px-2 py-1.5 text-[12.5px] outline-none"
          >
            <option value="internal">Internal</option>
            <option value="client_visible">Client visible</option>
          </select>
          {err && (
            <span className="text-[12px] text-[var(--error)]">{err}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} type="button">
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={busy}>
              {busy ? "Saving…" : existing ? "Save" : "Add meeting"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
