"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarChart3 } from "lucide-react";
import { useAppState } from "@/lib/store";
import { welcomeCopy } from "@/lib/onboarding/personalize";

export default function DashboardPage() {
  const { profile } = useAppState();
  const welcome = welcomeCopy(profile);

  return (
    <>
      <PageHeader
        title={welcome.greeting}
        description="Connect a platform to start seeing what's working."
      />
      <EmptyState
        icon={<BarChart3 className="w-4 h-4" />}
        title="Your content command center is waiting for data."
        description="Connect Instagram, YouTube, TikTok, or X and the dashboard will pull in reach, engagement, top posts, and what to do next."
        primaryAction={{ label: "Connect a platform", href: "/integrations" }}
      />
    </>
  );
}
