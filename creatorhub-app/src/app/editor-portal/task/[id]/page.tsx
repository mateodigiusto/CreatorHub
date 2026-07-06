"use client";

import { useParams } from "next/navigation";
import { TaskDetail } from "@/components/team/TaskDetail";

export default function EditorTaskPage() {
  const params = useParams<{ id: string }>();
  return (
    <TaskDetail
      taskId={params.id}
      lens="editor"
      backHref="/editor-portal"
      backLabel="Back to my tasks"
    />
  );
}
