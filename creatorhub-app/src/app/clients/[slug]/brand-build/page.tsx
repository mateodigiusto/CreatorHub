/**
 * Brand build tab — long-form 14-field brand profile editor with AI
 * transcript analyzer.
 *
 * STAGED. Final location: src/app/clients/[slug]/brand-build/page.tsx
 * after Phase 2 deletes the legacy [id] route.
 * See docs/plans/agency-clients-phase3-status.md.
 */

import { PageHeader } from "@/components/ui/PageHeader";
import { BrandBuildForm } from "@/components/agency/BrandBuildForm";

type Props = { params: Promise<{ slug: string }> };

export default async function BrandBuildPage({ params }: Props) {
  const { slug } = await params;
  return (
    <div>
      <PageHeader
        title="Brand build"
        description="The creator's voice, audience, mission, and visual fingerprint. Each field saves on blur. Use the AI analyzer to bootstrap from a transcript."
      />
      <BrandBuildForm slug={slug} />
    </div>
  );
}
