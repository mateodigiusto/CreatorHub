"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Wand2 } from "lucide-react";

export default function SequenceStudioPage() {
  return (
    <>
      <PageHeader
        title="Sequence Studio"
        description="Generate a story sequence from selected assets."
      />
      <EmptyState
        icon={<Wand2 className="w-4 h-4" />}
        title="Sequence Studio is moving inside the client workspace"
        description="You'll build sequences from a client's asset library so brand, voice, and offer stay correctly scoped. Open a client to upload assets first."
        primaryAction={{ label: "Open clients", href: "/clients" }}
      />
    </>
  );
}
