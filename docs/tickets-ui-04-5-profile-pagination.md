# UI-04.5 — Profile pagination (Phase C2)

## Goal
Reduce initial payload on profile pages by loading 20 posts first, with a "Load more" button using cursor pagination.

Pages:
- /app/me
- /app/profile/[id]

## Constraints
- Do not break existing post features: reactions, comments, delete, media attachments signing, profile links, presence dots.
- Keep current UI styling patterns.
- No schema/RLS changes.

## Implementation plan
1. Change initial posts query limit from 30 → 20.
2. Track cursor: last post `created_at` from the current list.
3. Add `Load more` button:
   - Fetch next 20 posts with `.lt("created_at", cursor)`
   - Append to list
4. Maintain the same secondary fetches:
   - attachments (batched signing via signPostAttachments helper)
   - reactions
   - avatar signing
5. Handle states:
   - loading initial
   - loading more
   - hasMore false when returned < 20

## What changed

### src/app/app/me/page.tsx
- Added `PAGE_SIZE = 20` constant; changed initial query `.limit(30)` → `.limit(PAGE_SIZE)`.
- Added `loadingMore` and `hasMore` state variables.
- Set `hasMore = rows.length === PAGE_SIZE` after initial fetch.
- Added `loadMorePosts()` async function:
  - Uses `created_at` cursor from last post in list.
  - Fetches next page with `.lt("created_at", cursor).order(...).limit(PAGE_SIZE)`.
  - Batch-fetches attachments and reactions for new posts (same pattern as initial load).
  - Signs media via `signPostAttachments`.
  - Deduplicates by existing post IDs before appending.
- Added "Load more" button below posts list (only visible when `hasMore` is true).
  - Shows spinner + "Loading..." while fetching.

### src/app/app/profile/[id]/page.tsx
- Same changes as `/app/me` — `PAGE_SIZE = 20`, `loadingMore`/`hasMore` state, `loadMorePosts()`, and "Load more" button.

### Not changed
- `PostCard.tsx` — untouched.
- `signPostAttachments.ts` — untouched.
- No schema or RLS changes.

## Manual test checklist
- [ ] `/app/me` loads quickly and shows latest 20 posts.
- [ ] Clicking "Load more" appends more posts (no duplicates).
- [ ] Reactions/comments still work on old + newly loaded posts.
- [ ] Media still loads (signed URLs) on both initial and paginated posts.
- [ ] Delete still works; deleting a post removes it from UI.
- [ ] `/app/profile/[id]` behaves the same as `/app/me`.
- [ ] "Load more" button disappears when fewer than 20 posts are returned.
- [ ] User with 0 posts sees "No posts published" — no Load more button.
- [ ] No console errors after multiple Load more clicks.
- [ ] No duplicate posts appear after rapid Load more clicks.

## Commands
- `npx tsc --noEmit` ✅ passes
