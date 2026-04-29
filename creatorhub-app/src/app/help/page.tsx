import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Mail, BookOpen, MessageCircle } from "lucide-react";

export default function HelpPage() {
  return (
    <>
      <PageHeader
        title="Help"
        description="Guides, support, and feedback."
      />
      <div className="grid grid-cols-3 gap-4">
        <HelpCard
          icon={BookOpen}
          title="Guides"
          body="Step-by-step walkthroughs of every workspace screen."
          cta="Open guides"
        />
        <HelpCard
          icon={MessageCircle}
          title="Live chat"
          body="Talk to a human. Mon–Fri, 9–6 ET."
          cta="Start chat"
        />
        <HelpCard
          icon={Mail}
          title="Email us"
          body="Tell us what's missing — we read every message."
          cta="Email support"
        />
      </div>
    </>
  );
}

function HelpCard({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Card>
      <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal grid place-items-center mb-4">
        <Icon className="w-4 h-4" />
      </div>
      <CardHeader title={title} description={body} />
      <Button variant="outline" size="sm">
        {cta}
      </Button>
    </Card>
  );
}
