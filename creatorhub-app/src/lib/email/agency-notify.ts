/**
 * Phase 8 — Agency-pivot transactional notifications.
 *
 * Thin wrappers over `sendEmail` + `agency-templates` so callers in route
 * handlers stay one-line. Returns `SendResult` so handlers can branch on
 * `sent: false` (e.g., RESEND_API_KEY unset in dev → don't block the user
 * flow, just log).
 *
 * Each function is "best effort, non-fatal": the request that triggered it
 * (invite accept, comment post) succeeds regardless of email delivery. Any
 * delivery failure is logged via `log.warn`.
 */

import { sendEmail, type SendResult } from "./send";
import {
  orgInviteEmail,
  clientWorkspaceInviteEmail,
  contentCommentEmail,
} from "./agency-templates";

export type SendOrgInviteArgs = {
  to: string;
  inviterName: string;
  organizationName: string;
  token: string;
  role: string;
  isAdmin: boolean;
};

export async function sendOrgInviteNotification(
  args: SendOrgInviteArgs,
): Promise<SendResult> {
  const t = orgInviteEmail({
    inviterName: args.inviterName,
    organizationName: args.organizationName,
    token: args.token,
    role: args.role,
    isAdmin: args.isAdmin,
  });
  return sendEmail({ to: args.to, subject: t.subject, html: t.html, text: t.text });
}

export type SendClientWorkspaceInviteArgs = {
  to: string;
  inviterName: string;
  organizationName: string;
  clientDisplayName: string;
  token: string;
  accessRole: string;
};

export async function sendClientWorkspaceInviteNotification(
  args: SendClientWorkspaceInviteArgs,
): Promise<SendResult> {
  const t = clientWorkspaceInviteEmail({
    inviterName: args.inviterName,
    organizationName: args.organizationName,
    clientDisplayName: args.clientDisplayName,
    token: args.token,
    accessRole: args.accessRole,
  });
  return sendEmail({ to: args.to, subject: t.subject, html: t.html, text: t.text });
}

export type SendContentCommentArgs = {
  to: string;
  authorName: string;
  organizationName: string;
  clientDisplayName: string;
  contentTitle: string;
  commentBody: string;
  permalinkPath: string;
  videoTimestamp?: string;
  isInternal: boolean;
};

export async function sendContentCommentNotification(
  args: SendContentCommentArgs,
): Promise<SendResult> {
  const t = contentCommentEmail({
    authorName: args.authorName,
    organizationName: args.organizationName,
    clientDisplayName: args.clientDisplayName,
    contentTitle: args.contentTitle,
    commentBody: args.commentBody,
    permalinkPath: args.permalinkPath,
    videoTimestamp: args.videoTimestamp,
    isInternal: args.isInternal,
  });
  return sendEmail({ to: args.to, subject: t.subject, html: t.html, text: t.text });
}
