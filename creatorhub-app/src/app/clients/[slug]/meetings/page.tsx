"use client";

/**
 * Meetings tab — list of meeting_notes for a client.
 *
 * STAGED — see docs/plans/agency-clients-phase5-NOTES.md.
 */

import { use } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MeetingsList } from "@/components/agency/meetings/MeetingsList";

export default function MeetingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <div className="p-6">
      <PageHeader
        title="Meetings"
        description="Capture decisions, attendees, and action items from each call."
      />
      <MeetingsList slug={slug} />
    </div>
  );
}
