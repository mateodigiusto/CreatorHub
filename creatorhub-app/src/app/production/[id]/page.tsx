"use client";

import { useParams } from "next/navigation";
import { TaskDetail } from "@/components/team/TaskDetail";

export default function ProductionTaskPage() {
  const params = useParams<{ id: string }>();
  return (
    <TaskDetail
      taskId={params.id}
      lens="manager"
      backHref="/production"
      backLabel="Back to production"
    />
  );
}
