"use client";

import { useEffect, useState } from "react";
import { FileText, ExternalLink, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FormatChip, ClientChip } from "@/components/team/bits";
import { readDemoContent, timeAgo, type DemoContentItem } from "@/lib/demo/team";

export default function ContentPage() {
  /* Demo: edits handed off from the Editor Portal / Production land here via
     localStorage. Purely additive — the original empty state still shows when
     nothing's been delivered yet. */
  const [delivered, setDelivered] = useState<DemoContentItem[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDelivered(readDemoContent());
  }, []);

  const items = delivered ?? [];

  return (
    <>
      <PageHeader
        title="Content"
        description="Library and pipeline of every piece you're working on."
      />

      {items.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[13px] font-semibold text-text">
              Delivered from production
            </h2>
            <Badge tone="green">
              <CheckCircle2 className="w-3 h-3" /> {items.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <Card key={item.id} lift className="h-full">
                <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                  <ClientChip client={item.client} />
                  <FormatChip format={item.format} />
                  <span className="flex-1" />
                  <Badge tone="green">Ready</Badge>
                </div>
                <div className="text-[14px] font-semibold text-text leading-snug">
                  {item.title}
                </div>
                <div className="flex items-center justify-between gap-2 mt-3.5 pt-3 border-t border-border">
                  <span className="text-[11.5px] text-muted">
                    Added {timeAgo(item.addedAt)}
                  </span>
                  {item.deliverableUrl && (
                    <a
                      href={item.deliverableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11.5px] text-accent hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Deliverable
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <EmptyState
        icon={<FileText className="w-4 h-4" />}
        title="Content lives inside each client"
        description="Pipelines, drafts, and scheduled posts now live in the client workspace. Open a client to see what's in flight."
        primaryAction={{ label: "Open clients", href: "/clients" }}
      />
    </>
  );
}
