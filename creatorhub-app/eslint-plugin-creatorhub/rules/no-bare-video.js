/**
 * Rule: creatorhub/no-bare-video
 *
 * `<VideoPlayer>` is the only sanctioned way to render video in the app.
 * It encodes the cost-control rules from the plan (poster-only by default,
 * preload="none", no autoplay API). Bare `<video>` JSX everywhere else
 * defeats the rules.
 *
 * Allowed callers:
 *   - src/components/ui/VideoPlayer.tsx (the component itself)
 *   - tests/** (fixtures for the rule's own regression test)
 */

"use strict";

function isAllowed(filename) {
  if (!filename) return false;
  return (
    filename.includes("/components/ui/VideoPlayer.tsx") ||
    filename.includes("/tests/")
  );
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Bare <video> tags are forbidden outside VideoPlayer.tsx. Use <VideoPlayer asset={...} /> instead.",
    },
    schema: [],
    messages: {
      bareVideo:
        "Bare <video> outside VideoPlayer.tsx defeats the cost-control rules. Use <VideoPlayer asset={...} />.",
      bareIframe:
        "Direct <iframe> to a Cloudflare Stream URL bypasses VideoPlayer's preload/autoplay rules. Use <VideoPlayer asset={...} />.",
      bareStreamElement:
        "Direct <stream-player> tag bypasses VideoPlayer's cost rules. Use <VideoPlayer asset={...} />.",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (isAllowed(filename)) return {};
    return {
      JSXOpeningElement(node) {
        const name = node.name;
        if (name.type !== "JSXIdentifier") return;
        if (name.name === "video") {
          context.report({ node, messageId: "bareVideo" });
        } else if (name.name === "iframe") {
          /* Only flag iframes pointing at Stream URLs. */
          for (const attr of node.attributes) {
            if (
              attr.type === "JSXAttribute" &&
              attr.name &&
              attr.name.name === "src" &&
              attr.value &&
              attr.value.type === "Literal" &&
              typeof attr.value.value === "string" &&
              attr.value.value.includes("cloudflarestream.com")
            ) {
              context.report({ node, messageId: "bareIframe" });
            }
          }
        } else if (name.name === "stream-player") {
          context.report({ node, messageId: "bareStreamElement" });
        }
      },
    };
  },
};
