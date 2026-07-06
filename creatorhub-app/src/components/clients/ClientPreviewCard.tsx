import { Eye } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";

/**
 * "View as client" card on /clients/[slug]/settings — opens the
 * client-facing workspace exactly as the client sees it. Only rendered
 * for org directors.
 */
export function ClientPreviewCard({ slug }: { slug: string }) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-accent" />
            View as client
          </span>
        }
        description="See your workspace exactly as your client sees it. You'll land in their portal with an option to return here at any time."
      />
      <form method="POST" action={`/api/clients/${slug}/preview`}>
        <button
          type="submit"
          className="btn-primary text-white inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-[10px] text-[13.5px] font-medium cursor-pointer transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <Eye className="w-4 h-4" />
          Open client view
        </button>
      </form>
    </Card>
  );
}
