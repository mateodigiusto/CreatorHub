"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  PlaySquare,
  Camera,
  Video,
  Hash,
  Mail,
  Calendar,
  Globe,
} from "lucide-react";

type Platform = {
  key: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const corePlatforms: Platform[] = [
  {
    key: "youtube",
    name: "YouTube",
    description: "Channel views, watch time, subscribers, top videos.",
    icon: PlaySquare,
  },
  {
    key: "instagram",
    name: "Instagram",
    description: "Profile, posts, Reels, insights, DMs.",
    icon: Camera,
  },
  {
    key: "tiktok",
    name: "TikTok",
    description: "Post performance and audience growth.",
    icon: Video,
  },
  {
    key: "x",
    name: "X",
    description: "Tweets, replies, impressions, follower growth.",
    icon: Hash,
  },
];

const otherIntegrations: Platform[] = [
  {
    key: "gcal",
    name: "Google Calendar",
    description: "Two-way sync for scheduled content slots.",
    icon: Calendar,
  },
  {
    key: "email",
    name: "Email reports",
    description: "Send weekly summaries to clients automatically.",
    icon: Mail,
  },
  {
    key: "site",
    name: "Website / Blog",
    description: "Repurpose top performing content into long-form.",
    icon: Globe,
  },
];

export default function IntegrationsPage() {
  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect your platforms to power Dashboard, Analytics, Ideas, Calendar, and Reports."
      />

      <Card className="mb-5">
        <CardHeader
          title="Platforms"
          description="None connected. Instagram OAuth ships once Meta App Review completes."
        />
        <ul className="grid grid-cols-2 gap-2.5 list-none p-0 m-0">
          {corePlatforms.map((p) => {
            const Icon = p.icon;
            return (
              <li
                key={p.key}
                className="flex items-center gap-3 p-3 rounded-[10px] border border-border bg-surface card-base"
              >
                <div className="w-10 h-10 rounded-[10px] bg-surface-2 text-text grid place-items-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[14px] font-semibold text-text">
                      {p.name}
                    </div>
                    <Badge tone="neutral">Coming soon</Badge>
                  </div>
                  <div className="text-[12.5px] text-muted mt-0.5">
                    {p.description}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader
          title="More integrations"
          description="Optional connections that extend the workflow"
        />
        <ul className="space-y-1 list-none p-0 m-0">
          {otherIntegrations.map((i) => {
            const Icon = i.icon;
            return (
              <li
                key={i.key}
                className="flex items-center gap-4 p-3 -mx-1 rounded-[10px] border border-transparent"
              >
                <div className="w-10 h-10 rounded-[10px] bg-surface-2 text-text grid place-items-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-text">
                    {i.name}
                  </div>
                  <div className="text-[12.5px] text-muted">
                    {i.description}
                  </div>
                </div>
                <Badge tone="neutral">Soon</Badge>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
