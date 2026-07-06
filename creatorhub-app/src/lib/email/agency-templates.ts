/**
 * Phase 8 — Agency-pivot email templates.
 *
 * Lives in its own file (separate from the legacy `templates.ts` that
 * builds the `/clients/${relationshipId}` invite/message templates) so it
 * doesn't collide with the Phase 1/2 agents who are still editing this
 * area. After the agency pivot lands, the legacy `templates.ts` can be
 * deleted in the same cleanup pass that drops the `relationship_*` UI.
 *
 * Three templates, called out by the Phase 8 plan:
 *   1. orgInviteEmail            — invite a teammate to an organization
 *   2. clientWorkspaceInviteEmail — invite a creator to the /workspace portal
 *   3. contentCommentEmail        — notify on a new content_items comment
 *
 * Constraints (same as legacy `templates.ts`):
 *   - Inline styles only (Gmail strips <style>).
 *   - Table-based layout (Outlook on Windows ignores flex/grid).
 *   - max-width: 560px, mobile-friendly viewport meta.
 *   - Plain-text fallback for accessibility + deliverability scoring.
 */

const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://creatorhub.app";

export type EmailTemplate = { subject: string; html: string; text: string };

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(args: {
  preheader: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  footerNote?: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(args.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${esc(args.preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F8FAFC;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:14px;border:1px solid #D8E0EA;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(180deg,#14315E 0%,#0B1F3A 100%);padding:18px 24px;">
                <span style="font-size:16px;font-weight:600;letter-spacing:-0.01em;color:#FFFFFF;">Creator<span style="color:#BFDBFE;">Hub</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 8px;">
                <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#07111F;font-weight:600;letter-spacing:-0.005em;">${esc(args.heading)}</h1>
                <div style="font-size:14px;line-height:1.55;color:#475569;">${args.body}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 28px;">
                <a href="${esc(args.ctaHref)}" style="display:inline-block;padding:10px 18px;background:linear-gradient(180deg,#14315E 0%,#0B1F3A 100%);color:#FFFFFF;text-decoration:none;border-radius:10px;font-size:14px;font-weight:500;">${esc(args.ctaLabel)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;border-top:1px solid #E2E8F0;font-size:12px;line-height:1.5;color:#94A3B8;">
                ${args.footerNote ? esc(args.footerNote) + "<br/><br/>" : ""}You're receiving this because you have an account at CreatorHub. Manage email preferences in <a href="${APP_URL}/settings" style="color:#2563EB;text-decoration:none;">Settings</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Org invite — sent when an admin invites a teammate to join an
 * `organizations` row. CTA points at `/invite/[token]` (Phase 1 owns the
 * accept route).
 */
export function orgInviteEmail(args: {
  inviterName: string;
  organizationName: string;
  token: string;
  /** 'user' | 'editor' | 'director' — base role on the invite row. */
  role: string;
  isAdmin: boolean;
}): EmailTemplate {
  const subject = `${args.inviterName} invited you to ${args.organizationName} on CreatorHub`;
  const heading = `Join ${args.organizationName}`;
  const roleLabel = args.isAdmin ? `${args.role} · admin` : args.role;
  const body =
    `<p style="margin:0 0 10px;"><strong>${esc(args.inviterName)}</strong> invited you to join <strong>${esc(args.organizationName)}</strong> on CreatorHub.</p>` +
    `<p style="margin:0 0 4px;">Role: <span style="color:#07111F;text-transform:capitalize;">${esc(roleLabel)}</span></p>` +
    `<p style="margin:0;color:#94A3B8;font-size:13px;">Sign in or create an account to accept.</p>`;
  const ctaHref = `${APP_URL}/invite/${encodeURIComponent(args.token)}`;
  return {
    subject,
    html: shell({
      preheader: `${args.inviterName} invited you to ${args.organizationName}.`,
      heading,
      body,
      ctaLabel: "Accept invite",
      ctaHref,
      footerNote: "Invites expire after 7 days.",
    }),
    text:
      `${args.inviterName} invited you to join ${args.organizationName} on CreatorHub.\n` +
      `Role: ${roleLabel}\n\n` +
      `Accept: ${ctaHref}\n\n` +
      `Invites expire after 7 days.\n`,
  };
}

/**
 * Client workspace invite — sent when an agency adds a creator as a
 * `client_owner` or `team_assigned` member of a client. The creator logs
 * into `/workspace/*` to see their portal.
 */
export function clientWorkspaceInviteEmail(args: {
  inviterName: string;
  organizationName: string;
  clientDisplayName: string;
  /** Invite token for /invite/[token]; pass empty string to link straight to /workspace. */
  token: string;
  /** 'client_owner' | 'team_assigned' */
  accessRole: string;
}): EmailTemplate {
  const tokenless = args.token.length === 0;
  const subject = `${args.inviterName} added you to ${args.clientDisplayName} on CreatorHub`;
  const heading = `Welcome to ${args.clientDisplayName}`;
  const roleSentence =
    args.accessRole === "client_owner"
      ? `You're set up as the creator owner — full read/write across the workspace.`
      : `You've been added to the team for this workspace.`;
  const body =
    `<p style="margin:0 0 10px;"><strong>${esc(args.inviterName)}</strong> at <strong>${esc(args.organizationName)}</strong> added you to the <strong>${esc(args.clientDisplayName)}</strong> workspace.</p>` +
    `<p style="margin:0 0 10px;">${esc(roleSentence)}</p>` +
    `<p style="margin:0;color:#94A3B8;font-size:13px;">${tokenless ? "Sign in and you'll land in your workspace." : "After accepting, you'll land in your workspace at /workspace."}</p>`;
  const ctaHref = tokenless
    ? `${APP_URL}/workspace`
    : `${APP_URL}/invite/${encodeURIComponent(args.token)}`;
  return {
    subject,
    html: shell({
      preheader: `${args.inviterName} added you to ${args.clientDisplayName}.`,
      heading,
      body,
      ctaLabel: "Open your workspace",
      ctaHref,
      footerNote: tokenless ? undefined : "Invites expire after 7 days.",
    }),
    text:
      `${args.inviterName} at ${args.organizationName} added you to the ${args.clientDisplayName} workspace on CreatorHub.\n` +
      `${roleSentence}\n\n` +
      `${tokenless ? "Open your workspace" : "Accept"}: ${ctaHref}\n` +
      `${tokenless ? "" : "\nInvites expire after 7 days.\n"}`,
  };
}

/**
 * Content comment — sent when a comment lands on a content_item (or an
 * asset_video). The notification fans out to every staff member subscribed
 * to the content_item PLUS, if `is_internal=false`, the client_owner(s).
 *
 * The `commentBody` is rendered as plain text (escaped), no markdown.
 * Truncated to 280 chars to keep email body short — full text is in-app.
 */
export function contentCommentEmail(args: {
  authorName: string;
  organizationName: string;
  clientDisplayName: string;
  contentTitle: string;
  commentBody: string;
  /** `${slug}/pipeline?card=${contentItemId}` or workspace equivalent. */
  permalinkPath: string;
  /** Optional timestamp on a video comment (e.g. "0:42"). */
  videoTimestamp?: string;
  /** Whether this comment is staff-only (is_internal=true). When true, the
   *  template still renders the same body — the route handler is
   *  responsible for not sending it to client users. */
  isInternal: boolean;
}): EmailTemplate {
  const truncated =
    args.commentBody.length > 280
      ? args.commentBody.slice(0, 277) + "…"
      : args.commentBody;
  const subject = `${args.authorName} commented on "${args.contentTitle}"`;
  const heading = `New comment on ${args.contentTitle}`;
  const tag = args.isInternal
    ? `<span style="display:inline-block;padding:2px 8px;background:rgba(37,99,235,0.08);color:#1D4ED8;border:1px solid rgba(37,99,235,0.18);border-radius:999px;font-size:11px;font-weight:500;letter-spacing:0.01em;text-transform:uppercase;margin-bottom:10px;">Internal</span><br/>`
    : "";
  const tsLine = args.videoTimestamp
    ? `<p style="margin:0 0 6px;color:#94A3B8;font-size:12px;">@ ${esc(args.videoTimestamp)}</p>`
    : "";
  const body =
    tag +
    `<p style="margin:0 0 12px;color:#94A3B8;font-size:13px;">${esc(args.clientDisplayName)} · ${esc(args.organizationName)}</p>` +
    tsLine +
    `<p style="margin:0 0 12px;color:#475569;"><strong style="color:#07111F;">${esc(args.authorName)}:</strong></p>` +
    `<p style="margin:0 0 4px;padding:12px 14px;background:#F1F5F9;border-left:3px solid #2563EB;border-radius:8px;color:#07111F;white-space:pre-wrap;">${esc(truncated)}</p>`;
  const ctaHref = `${APP_URL}${args.permalinkPath.startsWith("/") ? args.permalinkPath : "/" + args.permalinkPath}`;
  return {
    subject,
    html: shell({
      preheader: `${args.authorName}: ${truncated.slice(0, 80)}`,
      heading,
      body,
      ctaLabel: "Open thread",
      ctaHref,
    }),
    text:
      `${args.authorName} commented on "${args.contentTitle}"${args.videoTimestamp ? ` @ ${args.videoTimestamp}` : ""}` +
      `${args.isInternal ? " (internal)" : ""}:\n\n` +
      `${truncated}\n\n` +
      `Open: ${ctaHref}\n`,
  };
}
