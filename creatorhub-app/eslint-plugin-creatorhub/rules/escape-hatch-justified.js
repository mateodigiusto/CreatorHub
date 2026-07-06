/**
 * Rule: creatorhub/escape-hatch-justified
 *
 * Every `escapeHatch(...)` call requires an inline disable comment with a
 * justification of at least 20 characters. The disable shows up in the
 * diff so reviewers see every justification.
 *
 * Form:
 *   // eslint-disable-next-line creatorhub/escape-hatch-justified — <reason 20+ chars>
 *   escapeHatch("same reason as the comment, may be shorter at the call site").select(...)
 *
 * Bare `escapeHatch(...)` without the disable comment fails.
 */

"use strict";

const RULE_ID = "creatorhub/escape-hatch-justified";

function isEscapeHatchCall(node) {
  return (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === "escapeHatch"
  );
}

function hasJustifiedDisable(sourceCode, node) {
  const comments = sourceCode.getCommentsBefore(node);
  for (const c of comments) {
    if (c.type !== "Line" && c.type !== "Block") continue;
    const text = c.value.trim();
    if (!/eslint-disable(-next-line)?/.test(text)) continue;
    if (!text.includes(RULE_ID)) continue;
    const reason = text.split("--")[1] || text.split("—")[1] || "";
    if (reason.trim().length >= 20) return true;
  }
  return false;
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "escapeHatch() requires an inline disable comment with a 20+ char justification.",
    },
    schema: [],
    messages: {
      missing:
        "escapeHatch() requires `// eslint-disable-next-line creatorhub/escape-hatch-justified — <reason ≥ 20 chars>` on the line above.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    return {
      CallExpression(node) {
        if (!isEscapeHatchCall(node)) return;
        if (hasJustifiedDisable(sourceCode, node)) return;
        context.report({ node, messageId: "missing" });
      },
    };
  },
};
