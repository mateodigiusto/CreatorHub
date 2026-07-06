"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LineChart } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Deeper performance once a platform is connected."
      />
      <EmptyState
        icon={<LineChart className="w-4 h-4" />}
        title="No analytics yet"
        description="Connect Instagram, YouTube, TikTok, or X to pull in reach, follower growth, top posts, and best posting times."
        primaryAction={{ label: "Connect a platform", href: "/integrations" }}
      />
    </>
  );
}
