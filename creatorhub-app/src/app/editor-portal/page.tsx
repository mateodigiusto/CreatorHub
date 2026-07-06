"use client";

import { useMemo } from "react";
import { ListChecks } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { EditorBoard } from "@/components/team/EditorBoard";
import { EditorList } from "@/components/team/EditorList";
import { EditorCalendar } from "@/components/team/EditorCalendar";
import { useDemoTeam, daysUntilDue, type EditorView } from "@/lib/demo/team";

const VIEW_OPTIONS: { value: EditorView; label: string }[] = [
  { value: "list", label: "List" },
  { value: "board", label: "Board" },
  { value: "calendar", label: "Calendar" },
];

export default function EditorPortalPage() {
  const { myTasks, me, ready, viewPref, setView } = useDemoTeam();

  const dueThisWeek = useMemo(
    () =>
      myTasks.filter((t) => {
        if (t.status === "done") return false;
        const d = daysUntilDue(t.dueDate);
        return d >= 0 && d <= 7;
      }).length,
    [myTasks],
  );

  if (!ready) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[220px] rounded-[14px] bg-surface-2 border border-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  const greeting = me?.name ? `Hi ${me.name.split(" ")[0]}` : "Your tasks";
  const hasTasks = myTasks.length > 0;

  return (
    <>
      <PageHeader
        title={greeting}
        description={
          !hasTasks
            ? "Assignments will appear here."
            : dueThisWeek > 0
              ? `You have ${dueThisWeek} task${dueThisWeek === 1 ? "" : "s"} due this week.`
              : "You're all caught up for the week."
        }
        actions={
          hasTasks ? (
            <Tabs<EditorView>
              value={viewPref.view}
              onChange={setView}
              options={VIEW_OPTIONS}
            />
          ) : undefined
        }
      />

      {!hasTasks ? (
        <EmptyState
          icon={<ListChecks className="w-4 h-4" />}
          title="No tasks yet"
          description="Your assignments will show up here as soon as they're briefed to you."
        />
      ) : viewPref.view === "list" ? (
        <EditorList />
      ) : viewPref.view === "board" ? (
        <EditorBoard />
      ) : (
        <EditorCalendar />
      )}
    </>
  );
}
