"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Lightbulb } from "lucide-react";

export default function IdeasPage() {
  return (
    <>
      <PageHeader
        title="Ideas"
        description="AI-generated hooks aligned to what your audience is engaging with."
      />
      <EmptyState
        icon={<Lightbulb className="w-4 h-4" />}
        title="Idea generation needs performance data first"
        description="Once a platform is connected we'll learn what hooks land and surface six new ideas a week. Until then there's nothing meaningful to suggest."
        primaryAction={{ label: "Connect a platform", href: "/integrations" }}
      />
    </>
  );
}
