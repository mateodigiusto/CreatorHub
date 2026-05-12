# Phase 5 — Assets + Meetings + Comments + Video (Bunny.net Stream)

Status doc for the Phase 5 build of the Agency Clients pivot. Phase 5 ran
**in parallel** with Phases 1, 2, 3, and 4. Phase 1 has committed
(`4201e12`); Phases 2, 3, 4 were stashed mid-flight in parallel sessions.
This NOTES file is the single source of truth for what Phase 5 built, what
was deferred to avoid stomping other agents, and the exact cutover steps.

---

## What Phase 5 delivers

### Bunny.net Stream wrapper

`src/lib/bunny/client.ts` — server-side wrapper around Bunny.net Stream's
video library API. Replaces the role formerly held by `src/lib/stream.ts`
(Cloudflare). Exports:

- `createVideo({ title })` — creates an empty video shell; returns `{ guid, … }`.
- `getVideo(guid)` — current encode status + duration.
- `deleteVideo(guid)` — best-effort delete.
- `tusUploadParams(guid)` — returns the AuthorizationSignature / Expire /
  VideoId / LibraryId headers the browser needs to start a TUS upload.
- `signedPlaybackUrl(guid)` — HMAC-signed HLS URL (token-auth) for the player.
- `signedDownloadUrl(guid, format)` — signed MP4 download URL.
- `thumbnailUrl(guid)` — poster URL (poster is public on the CDN).
- `mapStatus(numericCode)` — maps Bunny's numeric status to our
  `bunny_video_status_t` enum (`uploading | processing | ready | failed`).

### Bunny TUS browser helper

`src/lib/bunny/tus.ts` — `startBunnyTusUpload(file, params, callbacks)`.
Dynamically imports `tus-js-client` (see "Dependencies" below). Chunk size
8 MiB, retryDelays `[0, 3000, 5000, 10000, 20000]`.

### TS types

`src/lib/agency/assets-types.ts` — typed shapes for `Folder`, `AssetLink`,
`AssetVideo`, `MeetingNote`, `ContentComment`, plus tree-building +
timecode helpers.

### Comments helper

`src/lib/agency/comments-helpers.ts` — `parseCommentInput` + `toComment`
shared by the content-item and asset-video comment endpoints.

### Phase 5 deps shim

`src/lib/agency/phase5-deps.ts` — self-contained session/role/plan stubs
that Phase 5 routes import from. Same pattern as Phase 3's `phase3-stubs.ts`
and Phase 2's `_phase1_deps.ts`. Replaced at cutover by real
`lib/auth/session.ts`, `lib/auth/require-client-access.ts`,
`lib/billing/limits.ts`. The shim is degradation-friendly: it returns a
placeholder session when the `organizations`/`clients` tables aren't
applied yet, so the routes 200 in dev.

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

### Components — final locations

These land at `src/components/agency/`. No routing impact, so they're
safe to commit at final paths. They are not imported anywhere outside the
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
(used by legacy creator-side flows) is **unchanged**. `BunnyVideoPlayer`
accepts pre-signed `hlsUrl` + `posterUrl` and exposes its `<video>` via ref
so the comment thread can read currentTime + seek.

The ESLint rule `creatorhub/no-bare-video` continues to allow `<video>`
only inside `VideoPlayer.tsx`; both players live in that file.

---

## Dependency on Phase 3 (schema 0035)

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

The migration `0035_client_workspace.sql` has been written by Phase 3 but
not yet committed (it lives in a parallel-session stash). When Phase 3 +
Phase 5 cut over together, apply 0035 first.

---

## Things Phase 5 deliberately did NOT do (flagged for cleanup)

These items are part of Phase 5's plan-line scope but were skipped to
avoid stomping other in-flight agents. Resolve at cutover:

### 1. Did NOT delete `src/lib/stream.ts`

The plan calls for retiring the Cloudflare Stream wrapper. Skipped because
`src/app/api/cron/run-jobs/route.ts` may still import from `stream.ts`.
Phase 1's commit notes already trimmed one branch of that route; deleting
`stream.ts` would need a second pass to confirm zero remaining imports.

**Cleanup step:** after Phase 2/4 stabilize, grep for `@/lib/stream` and
`copyFromUrl`. If only `cron/run-jobs` references it, gate that branch
(the transcode worker is non-functional in lean mode anyway per
`CLAUDE.md §10 Video pipeline`) and delete `src/lib/stream.ts`. Then
remove `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_STREAM_API_TOKEN` from
`.env.example`.

### 2. Did NOT update `AGENTS.md`

Plan §6 Phase 5 says "AGENTS.md must be updated to reference Bunny.net
Stream, not Cloudflare Stream." Skipped because parallel agents are
reading it as ground truth during the multi-phase build.

**Cleanup step:** at cutover, change the line in `AGENTS.md` § Stack from
> Cloudflare Stream for video transcoding + delivery (Phase 1 part 2).

to
> Bunny.net Stream for video upload + signed HLS delivery (Phase 5+).
> Cloudflare Stream wrapper was retired.

### 3. Did NOT install `tus-js-client`

Adding a dependency mid-flight risks colliding with concurrent
`package.json` edits in stashed Phase 2/3/4 work. The Bunny TUS helper
(`src/lib/bunny/tus.ts`) imports `tus-js-client` **dynamically** so the
build keeps compiling without it.

**Cleanup step:** run from `creatorhub-app/`:

```bash
npm i tus-js-client
```

Then optionally swap the dynamic `await import("tus-js-client")` for a
static `import * as tus from "tus-js-client"`.

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
all already live in Phase 3's `src/db/workspace-schema.ts` (when that
phase's stash is restored). Phase 3's cutover plan calls for inlining
that file into `schema.ts`. Phase 5 reuses Phase 3's table defs verbatim;
no schema additions of its own.

### 6. Did NOT touch `tests/migration-roundtrip.spec.ts` / `EXPECTED_SCHEMA_VERSION`

Phase 1 bumped `EXPECTED_SCHEMA_VERSION` to 33. Phase 3's cutover bumps to
35. No Phase 5 bump needed.

### 7. Did NOT wire Resend "new comment" emails

The POST handlers for `content_comments` are stubbed with `// TODO Phase 8`
where the Resend trigger goes. Adding it now would force `RESEND_FROM` to
be set, which the plan defers.

### 8. Did NOT enforce the per-card `team_assigned` access rule

Per §7 of the plan, `team_assigned` cannot post internal comments —
currently enforced by `parseCommentInput`'s `allowInternal: !client.isClientViewer`
gate. Org members of any role can flip `isInternal=true`. Fine-grained
role check ("only directors mark video `approved`") IS implemented in
`assets/videos/[id]/route.ts → PATCH`.

### 9. Did NOT remove the legacy `creator_relationships` code

Phase 1 already dropped these tables and the matching UI code.

### 10. Did NOT wire UI gates for video upload plan limits

`POST /api/clients/[slug]/assets/videos` calls
`assertPlanAllows(session, "videoUpload")` — the shim no-ops. Phase 6
flips the real enforcement; the UI button stays visible on Free plans
until Phase 6 layers a disabled state + tooltip.

---

## Cutover checklist (run AFTER Phases 1 + 2 + 3 are merged)

1. **Apply migration 0035** (Phase 3 owns the SQL). Phase 5 adds no schema.

2. **Move staged routes into place**

   ```bash
   cd creatorhub-app
   git mv src/app/_phase5-pending/api/clients/[slug]/folders                                 src/app/api/clients/[slug]/folders
   git mv src/app/_phase5-pending/api/clients/[slug]/assets                                  src/app/api/clients/[slug]/assets
   git mv src/app/_phase5-pending/api/clients/[slug]/meetings                                src/app/api/clients/[slug]/meetings
   git mv src/app/_phase5-pending/api/clients/[slug]/content/[id]/comments                   src/app/api/clients/[slug]/content/[id]/comments
   git mv src/app/_phase5-pending/clients-[slug]/assets                                      src/app/clients/[slug]/assets
   git mv src/app/_phase5-pending/clients-[slug]/meetings                                    src/app/clients/[slug]/meetings
   rmdir src/app/_phase5-pending/clients-[slug] src/app/_phase5-pending/api/clients/[slug] src/app/_phase5-pending/api/clients src/app/_phase5-pending/api src/app/_phase5-pending
   ```

3. **Replace stub imports.** In every Phase 5 file that imports from
   `@/lib/agency/phase5-deps`, swap to the real modules:

   | Stub import | Real module |
   |---|---|
   | `getAgencySession` | `@/lib/auth/session` `getSession` |
   | `requireClientAccess(slug)` | `@/lib/auth/require-client-access` |
   | `requireOrgRole(session, roles)` | `@/lib/auth/require-org-role` |
   | `requireOrgAdmin` | from session helpers |
   | `assertPlanAllows(session, cap)` | `@/lib/billing/limits` |
   | `HttpError` / `httpErrorResponse` | wherever the canonical error helpers land |

   Then delete `src/lib/agency/phase5-deps.ts`.

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

---

## Build-time context (race notes)

While Phase 5 was being written, a parallel-session sweep agent twice ran
`git stash --include-untracked` and dropped Phase 5's untracked files
between writes. The third attempt landed all files plus this NOTES doc;
the recovery path was to immediately commit Phase 5 as a unit. If you see
stashes named "more parallel work appeared during build" or similar, they
are likely from the same sweep — check their contents for Phase 2/3/4
work to merge back.
