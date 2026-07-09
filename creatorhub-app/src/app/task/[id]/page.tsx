import { Suspense } from "react";
import { SharedTaskView } from "@/components/team/SharedTaskView";

export default function SharedTaskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SharedTaskView />
    </Suspense>
  );
}
