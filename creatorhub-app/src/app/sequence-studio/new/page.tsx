"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Wand2 } from "lucide-react";

export default function SequenceStudioNewPage() {
  return (
    <>
      <PageHeader
        title="New sequence"
        description="The guided builder for story sequences."
      />
      <EmptyState
        icon={<Wand2 className="w-4 h-4" />}
        title="Build sequences from a client workspace"
        description="The sequence builder needs a client's assets, brand profile, and voice to do anything useful. Open a client and start from there."
        primaryAction={{ label: "Open clients", href: "/clients" }}
      />
    </>
  );
}
