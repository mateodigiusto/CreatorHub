"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAppState } from "@/lib/store";
import { StatusDot } from "@/components/ui/StatusDot";
import { Camera, Mail, Calendar, BarChart3, Globe } from "lucide-react";

const integrations = [
  {
    key: "instagram",
    name: "Instagram",
    description:
      "Pull profile, posts, insights, and DMs. Powers Dashboard, Analytics, Ideas, Calendar, and Reports.",
    icon: Camera,
    primary: true,
  },
  {
    key: "tiktok",
    name: "TikTok",
    description: "Post performance and audience growth.",
    icon: BarChart3,
    primary: false,
  },
  {
    key: "calendar",
    name: "Google Calendar",
    description: "Two-way sync for scheduled content slots.",
    icon: Calendar,
    primary: false,
  },
  {
    key: "email",
    name: "Email reports",
    description: "Send weekly summaries to clients automatically.",
    icon: Mail,
    primary: false,
  },
  {
    key: "site",
    name: "Website / Blog",
    description: "Repurpose top performing content into long-form.",
    icon: Globe,
    primary: false,
  },
];

export default function IntegrationsPage() {
  const { connected, setConnected } = useAppState();

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect your data sources. Instagram is the foundation — everything else is optional."
      />

      <Card className="mb-6 border-teal/30 bg-gradient-to-br from-teal/[0.05] to-teal-blue/[0.04]">
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 rounded-xl bg-teal text-white grid place-items-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-semibold tracking-tight text-navy">
                Instagram
              </h3>
              {connected ? (
                <Badge tone="green" className="!bg-emerald-500/10 !text-emerald-700 inline-flex items-center gap-1.5">
                  <StatusDot tone="teal" size={6} />
                  Connected
                </Badge>
              ) : (
                <Badge tone="amber">Not connected</Badge>
              )}
            </div>
            <p className="text-[13.5px] text-muted mt-1.5 max-w-2xl leading-relaxed">
              CreatorHub uses Meta&apos;s official Graph API. Connecting pulls in
              your profile, posts, insights, and message data — and powers every
              screen in the app.
            </p>
            <div className="flex items-center gap-2 mt-4">
              {connected ? (
                <>
                  <Button variant="outline" onClick={() => setConnected(false)}>
                    Disconnect
                  </Button>
                  <Button variant="ghost">Refresh data</Button>
                </>
              ) : (
                <Button onClick={() => setConnected(true)}>
                  Connect Instagram
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="More integrations"
          description="Coming soon — connect once Instagram is live"
        />
        <ul className="space-y-1">
          {integrations
            .filter((i) => !i.primary)
            .map((i) => {
              const Icon = i.icon;
              return (
                <li
                  key={i.key}
                  className="flex items-center gap-4 p-3 -mx-1 rounded-[10px] border border-transparent hover:border-teal/15 hover:bg-teal/[0.025] transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-[10px] bg-surface-2 text-text grid place-items-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-navy">
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
