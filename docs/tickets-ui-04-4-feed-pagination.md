# UI-04.4 — Feed pagination (Phase C1)

## Goal
Reduce initial payload on `/app/feed` by loading only 20 posts initially, and add a **Load more** button to fetch the next page using a cursor.

## Scope (strict)
- Only `/app/feed` changes
- No DB migrations
- No RLS changes
- No changes to PostCard, comments, reactions, delete permissions

## Plan
1) Change feed query `.limit(100)` → `.limit(20)` for initial load
2) Add cursor pagination:
   - Use `(created_at, id)` cursor for stability
   - Next page query:
     - order by created_at desc
     - then by id desc
     - fetch next 20 where:
       - created_at < lastCreatedAt OR (created_at = lastCreatedAt AND id < lastId)
3) Add "Load more" button:
   - disabled while loading
   - hides if fewer than 20 returned
4) Preserve existing ranking behavior:
   - Keep current “Fresh <24h newest-first + Recent shuffled daily” logic
   - Apply it within currently loaded posts only (do not reshuffle older pages)

## Acceptance checks
- `/app/feed` loads fast with 20 posts
- Clicking Load more appends posts (no duplicates)
- Deleting a post still removes it from UI
- Reactions/comments still work
- No changes to other routes

## Testing
- `npx tsc --noEmit`
- Manual:
  - Open `/app/feed` → confirm 20 max
  - Click Load more multiple times → appends 20 each time, no duplicates
  - With filter students/alumni → still filters within loaded posts
  - Try delete (as author/admin) still works

---

## Implementation Notes

### File changed
- `src/app/app/feed/page.tsx` — sole file modified (no other files touched)

### Implementation steps
1. Added `PAGE_SIZE = 20` constant, replaced `.limit(100)` with `.limit(PAGE_SIZE)`
2. Added secondary sort `.order("id", { ascending: false })` for stable cursor ordering
3. Added state: `loadingMore`, `hasMore`, `cursor` (tracks `{ createdAt, id }` of last raw row)
4. After initial fetch, cursor is set from the last row in the raw query result (oldest in batch)
5. `hasMore` set to `rows.length >= PAGE_SIZE`
6. Added `loadMore()` callback:
   - Uses PostgREST `.or()` filter: `created_at.lt.<cursor>,and(created_at.eq.<cursor>,id.lt.<cursorId>)`
   - Fetches attachments, reactions, avatars for the new batch (same hydration logic as initial load)
   - Appends to `posts` state without reshuffling existing items
   - Updates cursor and hasMore from new batch
7. Added "Load more" button below post list:
   - Hidden when `hasMore === false`
   - Shows spinner + "Loading..." text while `loadingMore === true`
   - Disabled during loading to prevent double-clicks
8. Ranking preserved: fresh/recent shuffle applied only on initial load; subsequent pages appended in `created_at desc, id desc` order

### What was NOT changed
- PostCard.tsx — untouched
- DB schema, migrations, RLS policies — untouched
- Delete, reactions, comments, avatar logic — untouched
- Filter UI — still filters within currently loaded posts client-side

### Type check
- `npx tsc --noEmit` — **PASS** (zero errors)

## Manual Test Checklist
- [ ] Open `/app/feed` → max 20 posts displayed on initial load
- [ ] "Load more" button visible at bottom of post list (if ≥20 posts exist)
- [ ] Click "Load more" → spinner appears, button disabled during fetch
- [ ] New posts appended below existing ones (no duplicates, no reorder of existing)
- [ ] Click "Load more" again → next batch appended
- [ ] When fewer than 20 returned, "Load more" button disappears
- [ ] Switch filter to "students" → filters within all loaded posts
- [ ] Switch filter to "alumni" → filters within all loaded posts
- [ ] Switch back to "all" → all loaded posts shown
- [ ] Delete a post (as author) → removed from UI immediately
- [ ] Delete a post (as admin) → removed from UI immediately
- [ ] Toggle a reaction on a post → count updates correctly
- [ ] Avatars display correctly on loaded posts
- [ ] Attachments (images/videos/links) render correctly on loaded posts
- [ ] Fresh posts (<24h) appear first, sorted newest-first
- [ ] Recent posts (1-5 days) appear shuffled after fresh posts (initial load only)