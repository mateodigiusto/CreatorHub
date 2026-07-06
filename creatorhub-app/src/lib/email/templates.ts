/**
 * Transactional email templates — pure string builders, no React Email.
 *
 * Constraints:
 *   - Inline styles only (Gmail strips `<style>` blocks).
 *   - Table-based layout (Outlook on Windows ignores flex/grid).
 *   - Mobile-friendly: `<meta viewport>` + max-width: 560px.
 *   - Plain-text fallback for accessibility + deliverability scoring.
 *
 * Brand: navy header, white body, blue CTA button. The wordmark is the
 * "CreatorHub" placeholder — when final logo lands, update this one place.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://creatorhub.app";

type Template = { subject: string; html: string; text: string };

function shell(args: {
  preheader: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}): string {
  /* The "preheader" is the gray preview text most clients show next to the
     subject in the inbox list. Hidden in the rendered email itself. */
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
                You're receiving this because you have an account at CreatorHub. Manage email preferences in <a href="${APP_URL}/settings" style="color:#2563EB;text-decoration:none;">Settings</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function inviteAcceptedEmail(args: {
  recipientName: string;
  counterpartyName: string;
  relationshipId: string;
}): Template {
  const subject = `${args.counterpartyName} accepted your invite`;
  const heading = "Invite accepted";
  const body = `<p style="margin:0 0 8px;"><strong>${esc(args.counterpartyName)}</strong> just accepted your invite to collaborate on CreatorHub.</p><p style="margin:0;">Open the relationship hub to assign tasks, share files, and start chatting.</p>`;
  const ctaHref = `${APP_URL}/clients/${args.relationshipId}`;
  return {
    subject,
    html: shell({
      preheader: `${args.counterpartyName} accepted your invite — open the hub to get started.`,
      heading,
      body,
      ctaLabel: "Open relationship",
      ctaHref,
    }),
    text: `${args.counterpartyName} accepted your invite to collaborate on CreatorHub.\n\nOpen the relationship hub: ${ctaHref}\n`,
  };
}

export function newInviteEmail(args: {
  recipientName: string;
  managerName: string;
  relationshipId: string;
}): Template {
  const subject = `${args.managerName} invited you to CreatorHub`;
  const heading = "You have a new invite";
  const body = `<p style="margin:0 0 8px;"><strong>${esc(args.managerName)}</strong> added you as a managed creator on CreatorHub.</p><p style="margin:0;">Accept to start receiving tasks, sharing files, and tracking your daily streak.</p>`;
  const ctaHref = `${APP_URL}/clients/${args.relationshipId}`;
  return {
    subject,
    html: shell({
      preheader: `${args.managerName} added you as a managed creator. Accept to get started.`,
      heading,
      body,
      ctaLabel: "Review invite",
      ctaHref,
    }),
    text: `${args.managerName} added you as a managed creator on CreatorHub.\n\nReview: ${ctaHref}\n`,
  };
}

export function newMessageEmail(args: {
  recipientName: string;
  senderName: string;
  preview: string;
  relationshipId: string;
}): Template {
  const subject = `New message from ${args.senderName}`;
  const heading = `${args.senderName} sent you a message`;
  const body = `<p style="margin:0 0 12px;color:#07111F;">${esc(args.preview)}</p><p style="margin:0;color:#94A3B8;font-size:13px;">Reply from the relationship hub.</p>`;
  const ctaHref = `${APP_URL}/clients/${args.relationshipId}`;
  return {
    subject,
    html: shell({
      preheader: args.preview.slice(0, 80),
      heading,
      body,
      ctaLabel: "Open chat",
      ctaHref,
    }),
    text: `${args.senderName}: ${args.preview}\n\nReply: ${ctaHref}\n`,
  };
}

export function taskAssignedEmail(args: {
  recipientName: string;
  managerName: string;
  taskTitle: string;
  relationshipId: string;
}): Template {
  const subject = `New task: ${args.taskTitle}`;
  const heading = "You have a new task";
  const body = `<p style="margin:0 0 8px;"><strong>${esc(args.managerName)}</strong> assigned you a new task:</p><p style="margin:0 0 4px;font-size:15px;color:#07111F;font-weight:500;">${esc(args.taskTitle)}</p>`;
  const ctaHref = `${APP_URL}/clients/${args.relationshipId}`;
  return {
    subject,
    html: shell({
      preheader: `${args.managerName} assigned: ${args.taskTitle}`,
      heading,
      body,
      ctaLabel: "Open task",
      ctaHref,
    }),
    text: `${args.managerName} assigned a new task: ${args.taskTitle}\n\nOpen: ${ctaHref}\n`,
  };
}
