/**
 * `/workspace/meetings` — meeting notes the agency has shared with this
 * creator. RLS already filters to `visibility='client_visible'` for
 * non-staff readers.
 *
 * Read-only for both `client_owner` and `team_assigned`. Phase 5 owns
 * the richer agency-side CRUD UI at `/clients/[slug]/meetings`.
 */

import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type MeetingRow = {
  id: string;
  title: string;
  meeting_date: string;
  body: string | null;
  attendees: string | null;
  action_items: string | null;
};

function formatMeetingDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function WorkspaceMeetingsPage() {
  const viewer = await requireWorkspaceAccess();
  const supabase = await getSupabaseServer();

  const { data: rows } = await supabase
    .from("meeting_notes")
    .select("id, title, meeting_date, body, attendees, action_items")
    .eq("client_id", viewer.client.id)
    .order("meeting_date", { ascending: false });

  const meetings = (rows ?? []) as MeetingRow[];

  return (
    <div className="p-6">
      <PageHeader
        title="Meetings"
        description="Notes from your strategy and review calls."
      />

      {meetings.length === 0 ? (
        <EmptyState
          title="No meeting notes yet"
          description="When your team marks meeting notes client-visible, they'll show up here."
          showSampleDataCta={false}
        />
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <Card key={m.id}>
              <div className="mb-2 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted" />
                <span className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-muted">
                  {formatMeetingDate(m.meeting_date)}
                </span>
              </div>
              <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text">
                {m.title}
              </h3>
              {m.attendees && (
                <p className="mt-1 text-[12.5px] text-muted">
                  <span className="font-medium text-text-2">Attendees:</span>{" "}
                  {m.attendees}
                </p>
              )}
              {m.body && (
                <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-text-2">
                  {m.body}
                </p>
              )}
              {m.action_items && (
                <div className="mt-3 rounded-[10px] border border-accent/15 bg-accent-soft p-3">
                  <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-accent">
                    Action items
                  </p>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text">
                    {m.action_items}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
