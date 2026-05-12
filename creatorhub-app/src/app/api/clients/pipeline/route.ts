/**
 * GET /api/clients/pipeline
 *
 * Editor-facing cross-client Pipeline view. Returns sequences grouped by
 * status across every active relationship the editor manages.
 *
 * Each sequence is annotated with the client's display name + relationship_id
 * so the UI can render it as a Kanban card linking back to that client's
 * workspace.
 *
 * Membership check: only relationships with manager_id=editorId AND
 * status='active' are considered. Sequences are read with the service-role
 * client (membership IS the security boundary, same pattern as everywhere
 * else in the editor multi-client mode).
 */

import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";

const SEQUENCE_STATUSES = ["draft", "scheduled", "published"] as const;
type SequenceStatus = (typeof SEQUENCE_STATUSES)[number];

type RelRow = {
  id: string;
  creator_id: string;
};

type CounterpartyRow = {
  id: string;
  email: string;
  display_name: string | null;
};

type SequenceRow = {
  id: string;
  user_id: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  updated_at: string;
};

type PipelineCard = {
  id: string;
  title: string;
  status: SequenceStatus | "other";
  scheduledAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  clientUserId: string;
  clientName: string;
  relationshipId: string;
};

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const editorId = userRes.user.id;

  /* Pull every active relationship the editor manages. RLS limits to the
     editor's own rows. */
  const { data: relsData } = await supabase
    .from("creator_relationships")
    .select("id, creator_id")
    .eq("manager_id", editorId)
    .eq("status", "active")
    .not("creator_id", "is", null);

  const rels = (relsData ?? []) as RelRow[];
  if (rels.length === 0) {
    return NextResponse.json({ cards: [], clients: [] });
  }

  const clientIds = rels.map((r) => r.creator_id);
  const admin = getSupabaseServiceRole();

  /* Counterparty names + sequences in parallel. */
  const [counterpartiesRes, sequencesRes] = await Promise.all([
    admin
      .from("users")
      .select("id, email, display_name")
      .in("id", clientIds)
      .returns<CounterpartyRow[]>(),
    admin
      .from("sequences")
      .select("id, user_id, title, status, scheduled_at, published_at, updated_at")
      .in("user_id", clientIds)
      .order("updated_at", { ascending: false })
      .limit(500)
      .returns<SequenceRow[]>(),
  ]);

  if (counterpartiesRes.error || sequencesRes.error) {
    log.error("clients.pipeline.load_failed", {
      counterparties: counterpartiesRes.error,
      sequences: sequencesRes.error,
    });
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  const nameByUser = new Map<string, string>();
  for (const c of counterpartiesRes.data ?? []) {
    nameByUser.set(c.id, c.display_name ?? c.email.split("@")[0] ?? "Client");
  }
  /* relationship_id is needed so cards can link to /clients/[relationshipId]. */
  const relByUser = new Map<string, string>();
  for (const r of rels) relByUser.set(r.creator_id, r.id);

  const cards: PipelineCard[] = (sequencesRes.data ?? []).map((s) => {
    const isKnownStatus = (SEQUENCE_STATUSES as readonly string[]).includes(s.status);
    return {
      id: s.id,
      title: s.title,
      status: isKnownStatus ? (s.status as SequenceStatus) : "other",
      scheduledAt: s.scheduled_at,
      publishedAt: s.published_at,
      updatedAt: s.updated_at,
      clientUserId: s.user_id,
      clientName: nameByUser.get(s.user_id) ?? "Client",
      relationshipId: relByUser.get(s.user_id) ?? "",
    };
  });

  return NextResponse.json({
    cards,
    clients: Array.from(nameByUser.entries()).map(([id, name]) => ({
      id,
      name,
      relationshipId: relByUser.get(id) ?? "",
    })),
  });
}
