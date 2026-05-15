"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Images } from "lucide-react";

export default function LibraryPage() {
  return (
    <>
      <PageHeader
        title="Asset Library"
        description="Photos and short videos you can drop into sequences."
      />
      <EmptyState
        icon={<Images className="w-4 h-4" />}
        title="Personal asset library is paused"
        description="Per-client asset libraries live inside each client workspace. Open a client to upload reference clips, B-roll, and finished posts."
        primaryAction={{ label: "Open clients", href: "/clients" }}
      />
    </>
  );
}
