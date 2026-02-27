# EXPO-03 — Media strategy (upload paths, signed URLs, caching)

## Goal
Define and implement a mobile-ready media strategy for Supabase Storage that works for:
- post-media (public bucket)
- profile-avatars (private bucket with owner path rule)
- message-media (private bucket with conversation membership rule)

Deliverables include docs + shared helpers in packages/shared to standardize paths and URL handling across Web and Expo.

## Inputs
- docs/contracts/supabase-contract.md (EXPO-01)
- Storage policies already applied in Supabase:
  - post-media: authenticated read/upload; delete by uploader or admin
  - profile-avatars: read allowed; upload/update/delete only if path owner
  - message-media: member read/upload; sender delete

## Non-goals
- No schema/policy changes
- No Expo app creation yet
- No UI changes in apps/web
- No Realtime implementation (docs may recommend later)

## Decisions to make (must be explicit)
1) Path conventions (single source of truth):
   - post-media: `posts/{postId}/{uuid}.{ext}`
   - profile-avatars: `avatars/{userId}/{uuid}.{ext}` (or current convention; must match is_avatar_path_owner)
   - message-media: `messages/{conversationId}/{messageId}/{uuid}.{ext}`
2) URL strategy:
   - post-media: public URL OR signed URL? (public bucket suggests public URL)
   - profile-avatars/message-media: signed URL with caching TTL
3) Caching strategy:
   - Recommended TTL values
   - Cache invalidation triggers (new upload, avatar change)
4) Upload semantics:
   - Content-Type handling
   - Filename extension normalization
   - Max size guidance
5) Deletion semantics:
   - post-media: allow delete if uploader/admin
   - message-media: only sender via message_attachments join rule

## Deliverables
- docs/media/strategy.md
- packages/shared/src/storage/paths.ts (authoritative path builders)
- packages/shared/src/storage/urls.ts (public vs signed URL helpers)
- packages/shared/src/storage/uploads.ts (platform-agnostic upload interface stubs; Expo implementation later)
- packages/shared/src/storage/index.ts barrel exports
- Update packages/shared/src/types/storage.ts if needed

## Acceptance criteria
- Path builders produce strings that match existing policy assumptions
- URL helpers clearly separate public vs signed URL cases
- Docs explain how Expo will pick files and upload (implementation deferred), but helpers are ready
- apps/web unchanged; web:typecheck and web:build still pass

## Test plan
- npm run web:typecheck
- npm run web:build

---

## Implementation Log

### 2026-02-26 — EXPO-03 completed

#### Decisions made

1. **Path conventions** — adopted from actual `apps/web` code (ground truth), not the contract doc:
   - `profile-avatars`: `avatars/{userId}/avatar.{ext}` (upsert: true, one per user)
   - `post-media`: `posts/{postId}/{fileId}.{ext}` (upsert: false, UUID per attachment)
   - `message-media`: `messages/{conversationId}/{messageId}/{fileId}.{ext}` (UUID per file)
   - Note: the EXPO-02 contract doc listed slightly different prefixes (e.g., `{userId}/{filename}` for avatars). The actual web code uses `avatars/` and `posts/` prefixes. We matched the code.

2. **URL strategy** — all three buckets are private; all reads use signed URLs with 1-hour TTL. `getPublicUrl` helper provided for future use if a bucket is made public.

3. **Caching** — web uses in-memory `Map` per page session. For Expo, recommended MMKV/AsyncStorage URL cache with TTL, plus `expo-image` built-in disk cache. Documented in strategy doc.

4. **Upload semantics** — `UploadSource` interface accepts `Blob | ArrayBuffer` (works for both web `File` objects and Expo `ArrayBuffer` from file URI reads). Content-type must always be explicit.

5. **Deletion** — documented per-bucket rules. App must delete storage objects before/alongside DB row deletion to avoid orphans.

#### Files created

| File | Purpose |
|------|---------|
| `docs/media/strategy.md` | Comprehensive media strategy document |
| `packages/shared/src/storage/paths.ts` | Path builders + extension helpers |
| `packages/shared/src/storage/urls.ts` | Signed/public URL helpers |
| `packages/shared/src/storage/uploads.ts` | Upload/remove interface + implementation |
| `packages/shared/src/storage/index.ts` | Barrel exports |

#### Files modified

| File | Change |
|------|--------|
| `packages/shared/src/types/storage.ts` | Added `SignedUrlResult` type; deprecated old path helpers with `@deprecated` JSDoc |
| `packages/shared/src/types/index.ts` | Added `SignedUrlResult` to type exports |
| `packages/shared/src/index.ts` | Added storage module re-exports |

#### Verification

- `npm run web:typecheck` — passed
- `npm run web:build` — passed
- No changes to `apps/web/` code
- No Supabase schema/policy changes