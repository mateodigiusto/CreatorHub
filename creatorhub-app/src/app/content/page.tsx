"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileText } from "lucide-react";

export default function ContentPage() {
  return (
    <>
      <PageHeader
        title="Content"
        description="Library and pipeline of every piece you're working on."
      />
      <EmptyState
        icon={<FileText className="w-4 h-4" />}
        title="Content lives inside each client"
        description="Pipelines, drafts, and scheduled posts now live in the client workspace. Open a client to see what's in flight."
        primaryAction={{ label: "Open clients", href: "/clients" }}
      />
    </>
  );
}
