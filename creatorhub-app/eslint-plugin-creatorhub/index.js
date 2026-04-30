/**
 * eslint-plugin-creatorhub — custom rules that enforce Phase 1 invariants.
 *
 * Rules:
 *   - no-raw-db-import-in-app           Ban raw `db` / `dbInternal` imports in app code.
 *   - escape-hatch-justified            Require an inline justification comment on escapeHatch().
 *   - no-third-party-in-with-audit      Ban fetch/SDK calls inside withAudit callbacks.
 *   - no-bare-video                     Force <video> to go through <VideoPlayer>.
 *
 * Wired in eslint.config.mjs.
 */

const noRawDbImport = require("./rules/no-raw-db-import-in-app");
const escapeHatchJustified = require("./rules/escape-hatch-justified");
const noThirdPartyInWithAudit = require("./rules/no-third-party-in-with-audit");
const noBareVideo = require("./rules/no-bare-video");

module.exports = {
  meta: { name: "eslint-plugin-creatorhub", version: "1.0.0" },
  rules: {
    "no-raw-db-import-in-app": noRawDbImport,
    "escape-hatch-justified": escapeHatchJustified,
    "no-third-party-in-with-audit": noThirdPartyInWithAudit,
    "no-bare-video": noBareVideo,
  },
};
