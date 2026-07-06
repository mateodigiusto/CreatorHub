# Phase 11 — §11 Open questions (build notes)

Built in parallel with Phases 1 & 2. §11 of the agency-clients plan lists
five open questions, two of which had buildable infrastructure that does
not collide with Phase 1 / 2 file ownership. Phase 11 picks those up and
**explicitly defers** the rest.

Mirrors the Phase 8 notes structure: new files only, integration steps at
merge time, explicit list of "did not touch" to keep the working tree
sane.

---

## §11 question status after this build

| # | Open question | Status going in | What Phase 11 did |
|---|---|---|---|
| 1 | Resend domain (DEFERRED) | Email code shipped, `EMAIL_FROM` blank | Added `docs/runbooks/resend-domain-setup.md` — SPF / DKIM / DMARC checklist + env-var checklist + first-send test. No code change. |
| 2 | Stripe Price IDs (DEFERRED to Phase 6) | Phase 6 owns | **Skipped.** Touching Stripe price plumbing now would step on the Phase 6 agent. |
| 3 | Role model (RESOLVED) | Resolved in §7 | **Nothing to build.** |
| 4 | Video provider → Bunny.net (RESOLVED) | Decision locked, no code | Built the server-side wrapper at `src/lib/bunny/client.ts` and the browser-side TUS config helper at `src/lib/bunny/tus.ts`. **Phase 5 still owns** wiring these into routes, retiring `src/lib/stream.ts`, updating `<VideoPlayer>`, and the AGENTS.md / CLAUDE.md edits. |
| 5 | Live data on `relationship_*` (CHECK PENDING) | User must run a count query before 0032 | Added `docs/runbooks/agency-pivot-preflight.md` — the count query + decision tree + optional export step + a `notifications` reference re-check. |

---

## What Phase 11 delivers

| File | What it does |
|---|---|
| `src/lib/bunny/client.ts` | Server-side Bunny.net Stream wrapper. `createVideo` returns the guid plus pre-signed TUS headers (SHA-256 over `libraryId + apiKey + expiresAt + videoId`). `getVideo` collapses Bunny's int status to our four-state enum (`uploading / processing / ready / failed`). `signedPlaybackUrl` + `signedDownloadUrl` use Bunny's token-auth signing (base64url(SHA-256(tokenAuthKey + path + expires + ip))). `thumbnailUrl` is unsigned. All env reads are on-demand (no eager init). |
| `src/lib/bunny/tus.ts` | Browser-side TUS config builder. **Does not import `tus-js-client`** — exports `buildBunnyTusOptions()` so Phase 5 imports the Upload constructor at the call site. Defaults: chunkSize 8MB, retryDelays `[0, 3000, 5000, 10000]`, `parallelUploads: 1`. |
| `docs/runbooks/resend-domain-setup.md` | DNS / SPF / DKIM / DMARC checklist for resolving §11 q1. |
| `docs/runbooks/agency-pivot-preflight.md` | Count query + decision tree for resolving §11 q5 before 0032 runs in prod. |
| `docs/plans/agency-clients-phase-11-NOTES.md` | This file. |

No edits to existing files. No deps added. No migrations.

---

## Files Phase 11 deliberately did NOT touch

To avoid stomping Phase 1 / 2 / 5's in-flight work:

- **`.env.example`** — Phase 1 owns `EXPECTED_SCHEMA_VERSION`. Adding the new Bunny env block here risks a merge conflict with Phase 1's bump commit. See the integration step below.
- **`src/lib/stream.ts`** — Phase 5 owns the deletion. Leaving it in place keeps any in-flight Phase 1/2 code that still references it compiling.
- **`src/components/ui/VideoPlayer.tsx`** — Phase 5 owns the swap from Cloudflare → Bunny URL shape. ESLint `creatorhub/no-bare-video` still applies; the player will read a signed Bunny HLS URL once Phase 5 wires it.
- **`AGENTS.md`** — Phase 5 cutover updates the video pipeline section. The Phase-11 wrapper is dormant infrastructure until Phase 5 references it; AGENTS.md staying on Cloudflare wording until then is intentional.
- **`creatorhub-app/CLAUDE.md` / repo-root `CLAUDE.md`** — Same. Phase 5 / Phase 12 (definition of done) own the prose update.
- **`package.json`** — Phase 4 / 5 actively add deps (`@dnd-kit/*`, `date-fns`, `tus-js-client`). Touching this file here would force a merge resolution every time another agent adds a dep.
- **`src/lib/email/send.ts`** / **`src/lib/email/agency-templates.ts`** / **`src/lib/email/agency-notify.ts`** — Phase 1 / Phase 8 own. The Resend runbook is pure docs; no code change needed.
- **Any `supabase/migrations/` file** — Phase 1 owns 0032; Phase 11 only documents the pre-flight check.

---

## Integration steps at merge time

Walk top-to-bottom after Phases 1, 2, 5 merge.

### 1. Append Bunny env vars to `.env.example`

After Phase 1 finishes bumping `EXPECTED_SCHEMA_VERSION`, add a new block at the bottom of `.env.example` (Phase 5 also covers this — dedupe if both land):

```
# ─── Bunny.net Stream (video) ─────────────────────────────────────
# Library ID + API key from bunny.net → Stream → Libraries.
# CDN hostname is the "Pull Zone" hostname Bunny generates per library
# (e.g. vz-abc123-xyz.b-cdn.net).
# Token auth key is under Library → API → Token Authentication Key.
BUNNY_STREAM_LIBRARY_ID=
BUNNY_STREAM_API_KEY=
BUNNY_STREAM_CDN_HOSTNAME=
BUNNY_STREAM_TOKEN_AUTH_KEY=
```

Drop the legacy Cloudflare block (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`) at the same time — Phase 5 retires the wrapper.

### 2. Install `tus-js-client`

```bash
cd creatorhub-app
npm i tus-js-client
```

Then in Phase 5's upload-UI component:

```ts
import * as tus from "tus-js-client";
import { buildBunnyTusOptions } from "@/lib/bunny/tus";

const opts = buildBunnyTusOptions({
  fileName: file.name,
  fileType: file.type,
  headers: presignedFromServer.headers,
  endpoint: presignedFromServer.endpoint,
  onProgress: (b, t) => setProgress(b / t),
  onSuccess: () => markUploaded(),
  onError: (e) => setError(e),
});
new tus.Upload(file, opts).start();
```

### 3. Wire `src/lib/bunny/client.ts` into Phase 5's routes

- `POST /api/clients/[slug]/assets/videos` → `createVideo({ title })` → return the `tus` block to the browser; insert `asset_videos` row with `bunny_video_id = video.guid` and `bunny_video_status = 'uploading'`.
- Status poller (or webhook, if Phase 5 wires Bunny webhooks) → `getVideo(guid)` → write the mapped status onto the row.
- Playback in `<VideoPlayer>` → `signedPlaybackUrl(guid)` → `.url`.
- Delete → `deleteVideo(guid)` (404 is OK — wrapper swallows it).

### 4. Retire `src/lib/stream.ts`

After grep confirms no remaining imports:

```bash
rg -l "from \"@/lib/stream\"" src/   # should be empty
git rm src/lib/stream.ts
```

Phase 5 owns this delete. Phase 11 leaves the file in place.

### 5. AGENTS.md / CLAUDE.md prose update

Replace the "Cloudflare Stream" mention in `creatorhub-app/AGENTS.md` (Stack section) and `CLAUDE.md` (`§10 Stack`, `§10 Video pipeline`) with the Bunny.net Stream equivalent. Phase 5 owns this — Phase 11 leaves the wording alone so the in-flight Phase 1 / 2 agents reading those files don't see whiplash.

### 6. Resolve the Resend domain (one-time)

Walk `docs/runbooks/resend-domain-setup.md` end-to-end. Required before any of the three Phase-8 notifiers (`sendOrgInviteNotification`, `sendClientWorkspaceInviteNotification`, `sendContentCommentNotification`) actually deliver.

### 7. Run the pre-flight before 0032 runs in prod

Walk `docs/runbooks/agency-pivot-preflight.md`. This blocks Phase 1's prod migration if the count query surfaces other users' data.

---

## Acceptance — Phase 11 done-when

- [x] `src/lib/bunny/client.ts` compiles standalone (no `tus-js-client` import, no `<VideoPlayer>` dependency).
- [x] `src/lib/bunny/tus.ts` compiles without `tus-js-client` installed.
- [x] `docs/runbooks/resend-domain-setup.md` walks the user from "domain not set" to "first send delivered".
- [x] `docs/runbooks/agency-pivot-preflight.md` documents the count query and decision tree.
- [x] No edits to existing source files (`.env.example`, `package.json`, `AGENTS.md`, `CLAUDE.md`, `src/lib/stream.ts`, `<VideoPlayer>`).
- [ ] Phase 5 wires the Bunny client into the asset-video routes and `<VideoPlayer>` (Phase 5's done-when, not Phase 11's).
- [ ] Phase 5 deletes `src/lib/stream.ts`.

---

## Risks called out

| Risk | Mitigation |
|---|---|
| Phase 5 agent also writes `src/lib/bunny/client.ts` | Phase 11 ships the wrapper first; Phase 5 inherits and only wires the routes / VideoPlayer. If Phase 5 reimplements, dedupe — prefer the version with the on-demand env reads and the four-state status mapper. |
| Bunny status int → enum mapping is wrong on edge codes (7, 8 = Jit segmenting) | `mapStatus()` returns `processing` for any unknown code. Worst case the UI shows "Processing" a beat longer than necessary. Phase 5 validates against a real upload before declaring complete. |
| Token-auth URL signing format mismatches Bunny's expectation | The wrapper follows Bunny's documented `base64url(SHA-256(tokenAuthKey + path + expires + ip))` convention. If a real library has Token Authentication disabled, the token simply has no effect and playback works anyway. Phase 5 validates with a real CDN hostname. |
| `EMAIL_FROM` differs between local dev and prod | The runbook makes both sides explicit (step 5). Watch for `{ sent: false, reason: 'unconfigured' }` in logs as the canary for a missing prod env var. |
| Pre-flight count query forgets a relationship table | The query lists all seven legacy tables explicitly. If 0032's drop list grows, update the runbook's `select` accordingly. |
| `.env.example` Bunny block not added at merge | The Bunny client throws a loud error (`"Bunny.net Stream not configured: …"`) on the first call. Caught in staging, not in prod. |
