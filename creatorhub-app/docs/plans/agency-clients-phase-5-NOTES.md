# Phase 5 — Assets + Meetings + Comments + Video (Bunny.net Stream)

Status doc for the Phase 5 build of the Agency Clients pivot. Phase 5 ran
**in parallel** with Phases 1, 2, 3, and 4, so several files are staged in
non-routed locations until Phases 1 & 2 land. Phase 4 routes (`content/*`)
do **not** include comments, so Phase 5's `content/[id]/comments/*` does
not conflict.

This doc is the single source of truth for what Phase 5 built, what was
deferred to avoid stomping other agents, and the exact cutover steps.

---

## What Phase 5 delivers

### Bunny.net Stream wrapper

`src/lib/bunny/client.ts` — server-side wrapper around Bunny.net Stream's
video library API. Replaces (functionally) the retired `src/lib/stream.ts`.
Exports:

- `createVideo({ title })` — creates an empty video shell; returns `{ guid, … }`.
- `getVideo(guid)` — current encode status + duration.
- `deleteVideo(guid)` — best-effort delete.
- `tusUploadParams(guid)` — returns the AuthorizationSignature / Expire /
  VideoId / LibraryId headers the browser needs to start a TUS upload.
- `signedPlaybackUrl(guid)` — HMAC-signed HLS URL (token-auth) for the
  player.
- `signedDownloadUrl(guid, format)` — signed MP4 download URL.
- `thumbnailUrl(guid)` — poster URL (poster is public on the CDN).
- `mapStatus(numericCode)` — maps Bunny's numeric status to our
  `bunny_video_status_t` enum (`uploading | processing | ready | failed`).

### Bunny TUS browser helper

`src/lib/bunny/tus.ts` — `startBunnyTusUpload(file, params, callbacks)`.
Dynamically imports `tus-js-client` (see "Dependencies" below).
Chunk size 8 MiB, retryDelays `[0, 3000, 5000, 10000, 20000]`.

### TS types

`src/lib/agency/assets-types.ts` — typed shapes for `Folder`, `AssetLink`,
`AssetVideo`, `MeetingNote`, `ContentComment`, plus tree-building +
timecode helpers. Lives in a separate file from `workspace-types.ts`
(Phase 3) and `content.ts` (Phase 4) so this build doesn't trample them.

### Comments helper

`src/lib/agency/comments-helpers.ts` — `parseCommentInput` + `toComment`
used by both the content-item and asset-video comment endpoints.

### Route handlers — STAGED

Same convention as Phase 3 (underscore-prefixed = excluded from Next.js
routing). Files live under `src/app/_phase5-pending/`:

```
_phase5-pending/api/clients/[slug]/folders/route.ts                              GET, POST
_phase5-pending/api/clients/[slug]/folders/[id]/route.ts                         PATCH, DELETE
_phase5-pending/api/clients/[slug]/assets/links/route.ts                         GET, POST
_phase5-pending/api/clients/[slug]/assets/links/[id]/route.ts                    PATCH, DELETE
_phase5-pending/api/clients/[slug]/assets/videos/route.ts                        GET, POST
_phase5-pending/api/clients/[slug]/assets/videos/[id]/route.ts                   GET (poller), PATCH, DELETE
_phase5-pending/api/clients/[slug]/assets/videos/[id]/comments/route.ts          GET, POST
_phase5-pending/api/clients/[slug]/assets/videos/[id]/comments/[commentId]/route.ts  PATCH, DELETE
_phase5-pending/api/clients/[slug]/content/[id]/comments/route.ts                GET, POST
_phase5-pending/api/clients/[slug]/content/[id]/comments/[commentId]/route.ts    PATCH, DELETE
_phase5-pending/api/clients/[slug]/meetings/route.ts                             GET, POST
_phase5-pending/api/clients/[slug]/meetings/[id]/route.ts                        PATCH, DELETE
```

### Pages — STAGED

```
_phase5-pending/clients-[slug]/assets/page.tsx
_phase5-pending/clients-[slug]/meetings/page.tsx
```

### Components

These live at their **final** locations under `src/components/agency/`
(safe to land — no routing). They are not imported anywhere outside the
staged pages, so they sit dormant until Phase 2's `[slug]` layout exists.

```
src/components/agency/assets/FolderTree.tsx
src/components/agency/assets/AssetLinkList.tsx
src/components/agency/assets/AssetVideoUploader.tsx
src/components/agency/assets/AssetVideoList.tsx
src/components/agency/assets/VideoCommentThread.tsx
src/components/agency/meetings/MeetingsList.tsx
```

### `<VideoPlayer>` change

A new named export `<BunnyVideoPlayer>` was added to
`src/components/ui/VideoPlayer.tsx`. The existing default `<VideoPlayer>`
(used by the legacy creator-side flows) is **unchanged**. `BunnyVideoPlayer`
accepts pre-signed `hlsUrl` + `posterUrl` and exposes its `<video>` via ref
so the comment thread can read currentTime + seek.

The ESLint rule `creatorhub/no-bare-video` continues to allow `<video>`
only inside `VideoPlayer.tsx`; both players live in that file.

---

## Dependencies on other phases — STILL STUBBED

Phase 5 imports its session / client-access / role / plan helpers from
`@/lib/agency/phase3-stubs` (the same stub Phase 3 uses). When Phase 1 +
Phase 2 land, swap to the real modules:

| Stub import | Real module (Phase 1/2) |
|---|---|
| `getAgencySession` | `@/lib/auth/session` `getSession` |
| `requireClientAccess(slug)` | `@/lib/auth/require-client-access` |
| `requireOrgRole(session, roles)` | `@/lib/auth/require-org-role` |
| `requireOrgAdmin` | from session helpers |
| `assertPlanAllows(session, cap)` | `@/lib/billing/limits` (Phase 6 enforces) |
| `HttpError` / `httpErrorResponse` | wherever Phase 1/2 lands these — could stay in `phase3-stubs.ts` if they're general |

This is the same swap-list Phase 3 already documents; Phase 5 doesn't
re-implement it.

---

## Dependencies on Phase 3 (schema 0035) — ASSUMED

Phase 5 reads/writes these tables introduced by migration 0035:

- `folders` (id, organization_id, client_id, parent_id, name, scope, visibility)
- `asset_links` (id, organization_id, client_id, folder_id, title, url, category, visibility)
- `asset_videos` (id, organization_id, client_id, folder_id, title,
  `bunny_video_id`, `bunny_video_status`, `bunny_video_duration_seconds`,
  `review_status`, `visibility`)
- `meeting_notes` (id, organization_id, client_id, meeting_date, title,
  body, attendees, action_items, visibility)
- `content_comments` (id, organization_id, client_id, content_item_id,
  asset_video_id, parent_id, author_id, body, is_internal,
  timestamp_seconds, resolved_at)

All columns above were verified against
`supabase/migrations/0035_client_workspace.sql` at write time.

The migration drops in cleanly because content_comments already has the
deferred `asset_video_id` FK constraint added once `asset_videos` exists.

---

## Things Phase 5 deliberately did NOT do (flagged for cleanup)

These items are part of Phase 5's plan-line scope but were skipped to
avoid stomping other in-flight agents. Resolve at cutover:

### 1. Did NOT delete `src/lib/stream.ts`

The plan calls for retiring the Cloudflare Stream wrapper. Skipped because
`creatorhub-app/src/app/api/cron/run-jobs/route.ts` is **modified** in the
working tree and likely still imports from `stream.ts`. Deleting the file
would break that route's TS compile.

**Cleanup step:** after Phase 2/4 stabilize, grep for `@/lib/stream` and
`copyFromUrl`. If only `cron/run-jobs` references it, gate that branch
(the transcode worker is non-functional in lean mode anyway per
`CLAUDE.md §10 Video pipeline`) and delete `src/lib/stream.ts`. Then
remove `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_STREAM_API_TOKEN` from
`.env.example`.

### 2. Did NOT update `AGENTS.md`

Plan §6 Phase 5 says "AGENTS.md must be updated to reference Bunny.net
Stream, not Cloudflare Stream." Skipped because Phase 4 + others may still
be reading it as ground truth during the parallel build.

**Cleanup step:** at cutover, change the line in `AGENTS.md` § Stack from
> Cloudflare Stream for video transcoding + delivery (Phase 1 part 2).

to
> Bunny.net Stream for video upload + signed HLS delivery (Phase 5+).
> Cloudflare Stream wrapper was retired.

### 3. Did NOT install `tus-js-client`

Adding a dependency mid-flight conflicts with the package.json edits
Phase 4 is making (`@dnd-kit/*`, `date-fns`). The Bunny TUS helper
(`src/lib/bunny/tus.ts`) imports `tus-js-client` **dynamically** so the
build keeps compiling without it.

**Cleanup step:** run from `creatorhub-app/`:

```bash
npm i tus-js-client
```

Then optionally swap the dynamic `await import("tus-js-client")` in
`src/lib/bunny/tus.ts` for a static `import * as tus from "tus-js-client"`.

### 4. Did NOT add the new `.env.example` entries

The repo's `.env.example` is touched by every phase agent; bumping
`EXPECTED_SCHEMA_VERSION` and adding Bunny vars at the same time would
collide. Cutover should append these to `.env.example`:

```
# ─── Bunny.net Stream (video) ─────────────────────────────────────
BUNNY_STREAM_LIBRARY_ID=
BUNNY_STREAM_API_KEY=
BUNNY_STREAM_CDN_HOSTNAME=
BUNNY_STREAM_TOKEN_AUTH_KEY=
```

(Remove the equivalent `CLOUDFLARE_*` block as part of cleanup item 1.)

### 5. Did NOT add to `src/db/schema.ts`

`asset_videos`, `asset_links`, `folders`, `meeting_notes`, `content_comments`
all already live in Phase 3's `src/db/workspace-schema.ts`. Phase 3's
cutover plan calls for inlining that file into `schema.ts`. Phase 5
reuses Phase 3's table defs verbatim; no schema additions of its own.

### 6. Did NOT touch `tests/migration-roundtrip.spec.ts` / `EXPECTED_SCHEMA_VERSION`

Same reason: each phase bumping this would fight other agents.

### 7. Did NOT wire Resend "new comment" emails

The POST handlers for `content_comments` are stubbed with a `// TODO`
where the Resend trigger goes. Phase 1 ships the `lib/email/notify.ts`
helper; Phase 8 polishes templates. Adding it now would force `RESEND_FROM`
to be set, which the plan defers.

### 8. Did NOT enforce the per-card `team_assigned` access rule

The Pipeline note in Phase 4 already calls this out
(§"Things deliberately deferred"). Phase 5 leaves comments/asset writes
open to any org member; per §7 of the plan, `team_assigned` cannot post
internal comments — currently enforced by the `is_internal` opt-in flag
+ `allowInternal: !client.isClientViewer` flag in `parseCommentInput`,
which gates clients-side users. Org members of any role can flip it.
Fine-grained role check ("only directors mark video `approved`") IS
implemented in `assets/videos/[id]/route.ts → PATCH`.

### 9. Did NOT remove the legacy `creator_relationships` code

Same reason as Phase 3/4 — that's Phase 1's `0032_drop_relationships.sql`
plus Phase 2's UI delete.

### 10. Did NOT wire UI gates for video upload plan limits

`POST /api/clients/[slug]/assets/videos` calls
`assertPlanAllows(session, "videoUpload")` — the stub no-ops. Phase 6
flips the real enforcement; the UI button stays visible on Free plans
until Phase 6 layers a disabled state + tooltip.

---

## Cutover checklist (run AFTER Phases 1 + 2 are merged)

1. **Apply migration 0035** (Phase 3 already wrote it). Phase 5 added no
   schema of its own.

2. **Move staged routes into place**

   ```bash
   cd creatorhub-app
   git mv src/app/_phase5-pending/api/clients/[slug]/folders                                 src/app/api/clients/[slug]/folders
   git mv src/app/_phase5-pending/api/clients/[slug]/assets                                  src/app/api/clients/[slug]/assets
   git mv src/app/_phase5-pending/api/clients/[slug]/meetings                                src/app/api/clients/[slug]/meetings
   git mv src/app/_phase5-pending/api/clients/[slug]/content/[id]/comments                   src/app/api/clients/[slug]/content/[id]/comments
   git mv src/app/_phase5-pending/clients-[slug]/assets                                      src/app/clients/[slug]/assets
   git mv src/app/_phase5-pending/clients-[slug]/meetings                                    src/app/clients/[slug]/meetings
   rmdir src/app/_phase5-pending/...   # whatever empties out
   ```

3. **Replace stub imports** in every Phase 5 file that imports from
   `@/lib/agency/phase3-stubs`. Same swap-list as Phase 3 — both phases
   share the stub.

4. **Install `tus-js-client`**:

   ```bash
   npm i tus-js-client
   ```

   Optional: switch `src/lib/bunny/tus.ts` from dynamic import to static.

5. **Append the Bunny env block to `.env.example`** (see "Things Phase 5
   did NOT do → 4").

6. **Retire `src/lib/stream.ts`** (see "Things Phase 5 did NOT do → 1").

7. **Update AGENTS.md** Stack section (see "Things Phase 5 did NOT do → 2").

8. **Wire SubNav** — Phase 2's `[slug]/layout.tsx` should include the two
   Phase-5 tabs alongside Phase 3's three and Phase 4's three:

   ```
   { label: "Assets",   href: "…/assets"   }
   { label: "Meetings", href: "…/meetings" }
   ```

9. **Lint + test pass**

   ```bash
   npm run lint && npm run build && npm run test:migration && npm run test:rls
   ```

---

## Acceptance criteria (verify after cutover)

- [ ] Upload an MP4 via the AssetVideoUploader — status transitions
      `uploading → processing → ready` within ~30s for a short clip.
- [ ] The video plays in `<BunnyVideoPlayer>` via the signed HLS URL.
- [ ] Anchored timestamp comment lands at the right second; clicking the
      timecode badge seeks the player to that moment.
- [ ] Internal comments are hidden from `/workspace/*` viewers (Phase 7
      builds the portal; verify via RLS test that `is_internal=true` rows
      are unreadable to client_memberships).
- [ ] Folder rename / move / delete cascade correctly.
- [ ] Meeting CRUD round-trips (create, edit, delete).
- [ ] Director marking a video `approved` succeeds; editor/user role gets 403.
- [ ] `creatorhub/no-bare-video` ESLint rule still green.
- [ ] Total Bunny.net bandwidth during dev test stays inside free-tier
      threshold (per §10 Risks in the plan).
