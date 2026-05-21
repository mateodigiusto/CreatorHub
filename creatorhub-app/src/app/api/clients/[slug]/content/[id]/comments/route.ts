/**
 * GET   /api/clients/[slug]/content/[id]/comments
 * POST  /api/clients/[slug]/content/[id]/comments
 *
 * Threaded comments on content_items. Phase 4 owns the rest of the
 * /content/[id] tree (route.ts, move, metrics) but does not ship comments,
 * so this addition does not collide.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import {
  getAgencySession,
  requireClientAccess,
  HttpError,
  httpErrorResponse,
} from "@/lib/agency/phase5-deps";
import {
  toComment,
  parseCommentInput,
  type CommentDbRow,
} from "@/lib/agency/comments-helpers";
import { sendContentCommentNotification } from "@/lib/email/agency-notify";
import { log } from "@/lib/log";

type Params = { params: Promise<{ slug: string; id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    const client = await requireClientAccess(slug);
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("content_comments")
      .select("*")
      .eq("client_id", client.id)
      .eq("content_item_id", id)
      .order("created_at", { ascending: true })
      .returns<CommentDbRow[]>();
    if (error) throw new HttpError(500, "db_read_failed");
    return NextResponse.json({ comments: (data ?? []).map(toComment) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  try {
    const session = await getAgencySession();
    if (!session) throw new HttpError(401, "unauthorized");
    const client = await requireClientAccess(slug);

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      throw new HttpError(400, "invalid_json");
    }

    let parsed;
    try {
      parsed = parseCommentInput(body, {
        allowInternal: !client.isClientViewer,
      });
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : "invalid");
    }

    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("content_comments")
      .insert({
        organization_id: client.organizationId,
        client_id: client.id,
        content_item_id: id,
        asset_video_id: null,
        parent_id: parsed.parentId,
        author_id: session.userId,
        body: parsed.body,
        is_internal: parsed.isInternal,
        timestamp_seconds: parsed.timestampSeconds,
      } as never)
      .select("*")
      .single()
      .returns<CommentDbRow>();
    if (error || !data) throw new HttpError(500, "db_write_failed");

    /* Fire-and-forget comment notifications. Skipped silently when
       RESEND_API_KEY isn't set (dev / preview deploys); other failures
       log a warn but never block the POST. */
    void notifyParticipants({
      slug,
      contentItemId: id,
      clientId: client.id,
      clientDisplayName: client.displayName,
      organizationId: client.organizationId,
      authorId: session.userId,
      commentBody: parsed.body,
      isInternal: parsed.isInternal,
    }).catch((err) => log.warn("comments.notify_failed", { err: String(err) }));

    return NextResponse.json({ comment: toComment(data) });
  } catch (err) {
    return httpErrorResponse(err);
  }
}

/* Recipient lookup: thread participants (other authors on this content
   item) + the content's `created_by`. Each recipient must be verified as
   org staff OR an active client viewer of this client before we email
   them — a stray author_id outside the org is dropped. Staff and client
   recipients get different permalinks; internal comments skip clients. */
async function notifyParticipants(args: {
  slug: string;
  contentItemId: string;
  clientId: string;
  clientDisplayName: string;
  organizationId: string;
  authorId: string;
  commentBody: string;
  isInternal: boolean;
}): Promise<void> {
  const admin = getSupabaseServiceRole();

  /* Org name (email subject), content title, and every comment author on
     this thread — in parallel. */
  const [orgRes, contentRes, threadRes] = await Promise.all([
    admin
      .from("organizations")
      .select("name")
      .eq("id", args.organizationId)
      .maybeSingle()
      .returns<{ name: string } | null>(),
    admin
      .from("content_items")
      .select("title, created_by")
      .eq("id", args.contentItemId)
      .maybeSingle()
      .returns<{ title: string | null; created_by: string | null } | null>(),
    admin
      .from("content_comments")
      .select("author_id")
      .eq("content_item_id", args.contentItemId)
      .returns<Array<{ author_id: string }>>(),
  ]);

  const content = contentRes.data;
  if (!content) return;
  const orgName = orgRes.data?.name ?? "CreatorHub";
  const contentTitle = content.title ?? "Untitled content";

  /* Deduped recipient set: thread authors + content creator, minus the
     current author. */
  const recipientIds = new Set<string>();
  for (const r of threadRes.data ?? []) {
    if (r.author_id && r.author_id !== args.authorId) recipientIds.add(r.author_id);
  }
  if (content.created_by && content.created_by !== args.authorId) {
    recipientIds.add(content.created_by);
  }
  if (recipientIds.size === 0) return;
  const ids = Array.from(recipientIds);

  /* Resolve in parallel: the comment author's name; recipient emails;
     which recipients are org staff; which are active client viewers of
     this client. The `organization_memberships` join column is
     `profile_id` (not `user_id`). */
  const [authorRes, usersRes, staffRes, clientRes] = await Promise.all([
    admin
      .from("users")
      .select("display_name, email")
      .eq("id", args.authorId)
      .maybeSingle()
      .returns<{ display_name: string | null; email: string } | null>(),
    admin
      .from("users")
      .select("id, email, display_name")
      .in("id", ids)
      .returns<Array<{ id: string; email: string; display_name: string | null }>>(),
    admin
      .from("organization_memberships")
      .select("profile_id")
      .eq("organization_id", args.organizationId)
      .in("profile_id", ids)
      .returns<Array<{ profile_id: string }>>(),
    admin
      .from("client_memberships")
      .select("profile_id")
      .eq("client_id", args.clientId)
      .eq("status", "active")
      .in("profile_id", ids)
      .returns<Array<{ profile_id: string }>>(),
  ]);

  const author = authorRes.data;
  const authorName =
    author?.display_name ?? author?.email?.split("@")[0] ?? "A teammate";
  const staffIds = new Set((staffRes.data ?? []).map((r) => r.profile_id));
  const clientIds = new Set((clientRes.data ?? []).map((r) => r.profile_id));
  const users = usersRes.data ?? [];

  await Promise.all(
    users.map(async (u) => {
      const isStaff = staffIds.has(u.id);
      const isClientViewer = clientIds.has(u.id);
      /* Drop anyone who is neither org staff nor an active client viewer
         of this client. */
      if (!isStaff && !isClientViewer) return;
      /* Internal comments are staff-only — never email client viewers. */
      if (args.isInternal && !isStaff) return;
      const permalinkPath = isStaff
        ? `/clients/${args.slug}/pipeline?card=${args.contentItemId}`
        : `/workspace/pipeline?card=${args.contentItemId}`;
      const res = await sendContentCommentNotification({
        to: u.email,
        authorName,
        organizationName: orgName,
        clientDisplayName: args.clientDisplayName,
        contentTitle,
        commentBody: args.commentBody,
        permalinkPath,
        isInternal: args.isInternal,
      });
      if (!res.sent && res.reason !== "unconfigured") {
        log.warn("comments.notify_send_failed", {
          to: u.email,
          reason: res.reason,
        });
      }
    }),
  );
}
