"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Calendar } from "lucide-react";

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        title="Calendar"
        description="Month view of scheduled and posted content."
      />
      <EmptyState
        icon={<Calendar className="w-4 h-4" />}
        title="Calendar lives per client"
        description="Each client workspace has its own calendar of scheduled and posted content. Open a client to plan the week."
        primaryAction={{ label: "Open clients", href: "/clients" }}
      />
    </>
  );
}
