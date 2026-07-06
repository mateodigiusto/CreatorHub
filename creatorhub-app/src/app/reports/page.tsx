"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileBarChart } from "lucide-react";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Client-ready weekly and monthly summaries."
      />
      <EmptyState
        icon={<FileBarChart className="w-4 h-4" />}
        title="Reports unlock once a platform is connected"
        description="We'll generate weekly and monthly performance summaries with growth charts, top content, and AI commentary as soon as data starts flowing."
        primaryAction={{ label: "Connect a platform", href: "/integrations" }}
      />
    </>
  );
}
