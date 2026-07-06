/**
 * Strategy tab — 4-field next-steps form. Same row as brand_profiles
 * (the `next_steps_*` columns), so saves go through the same PATCH route.
 *
 * STAGED. Final location: src/app/clients/[slug]/strategy/page.tsx.
 */

import { PageHeader } from "@/components/ui/PageHeader";
import { NextStepsForm } from "@/components/agency/NextStepsForm";

type Props = { params: Promise<{ slug: string }> };

export default async function StrategyPage({ params }: Props) {
  const { slug } = await params;
  return (
    <div>
      <PageHeader
        title="Strategy"
        description="Goal, focus areas, metrics, and blockers for the next 30 days. Revisit weekly."
      />
      <NextStepsForm slug={slug} />
    </div>
  );
}
