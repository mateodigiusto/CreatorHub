import { Suspense } from "react";
import { ClientPortalView } from "@/components/hub/ClientPortalView";

export default function ClientPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ClientPortalView />
    </Suspense>
  );
}
