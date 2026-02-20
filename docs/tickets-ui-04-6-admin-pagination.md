# UI-04.6 — Admin Dashboard Pagination (Phase C3)

## Goal
Reduce initial payload on /app/admin for scale and faster load.
Add pagination for:
- Posts Moderation list
- Users Management list

## Non-goals (do not change)
- RLS, policies, role checks
- Delete/disable logic
- Tutor promotion/demotion logic
- Course assignment logic
- PostCard component or styling

## Requirements
### Posts Moderation
- PAGE_SIZE = 20
- Initial query replaces .limit(100) with .limit(PAGE_SIZE)
- Add "Load more posts" button
- Cursor: created_at of last loaded post
- On load more:
  - Fetch next page with .lt("created_at", cursor)
  - Fetch attachments for those post_ids and sign using signPostAttachments (batch)
  - Fetch reactions for those post_ids
  - Append deduped posts only
- When timeFilter or audienceFilter changes: reset list and refetch first page.

### Users Management
- USER_PAGE_SIZE = 25
- Initial query replaces .limit(50) with .limit(USER_PAGE_SIZE)
- Add "Load more users" button
- Cursor: created_at of last loaded user row
- On load more:
  - Fetch next page with .lt("created_at", cursor)
  - Resolve avatar URLs for new users only
  - Append deduped users only
- Keep existing client-side search behavior (search within loaded set).

## Testing
- Admin account:
  - /app/admin loads fast
  - Filters still work
  - Load more posts appends older posts
  - Selecting/deleting posts still works
  - Load more users appends older users
  - Disable user still works (and UI updates)
  - Tutor save and course save still work
- Non-admin:
  - still sees Not Authorized

## Commands
- npx tsc --noEmit
- npm run dev (smoke test)

---

## Implementation Notes

### Files changed
- `src/app/app/admin/page.tsx`

### Posts pagination
- Added constants `PAGE_SIZE = 20` and `USER_PAGE_SIZE = 25`.
- Replaced `.limit(100)` with `.limit(PAGE_SIZE)` in `fetchPosts()`.
- Added state: `hasMorePosts`, `loadingMorePosts`.
- `hasMorePosts` set to `true` when fetched rows count === PAGE_SIZE.
- Added `loadMorePosts()`:
  - Uses `created_at` of last post as cursor with `.lt("created_at", cursor)`.
  - Applies same `gte("created_at", cutoff)` time filter.
  - Fetches attachments via `signPostAttachments` and reactions for new post IDs only.
  - Dedupes by existing post ID set before appending.
  - Resolves avatar URLs for new authors only.
- "Load more posts" button shown when `hasMorePosts` is true, disabled while loading.
- `fetchPosts()` (called on timeFilter change) fully resets posts, selection, and hasMore.
- `audienceFilter` remains client-side only (filters `posts` into `filteredPosts`), no refetch needed.

### Users pagination
- Replaced `.limit(50)` with `.limit(USER_PAGE_SIZE)` in `fetchUsers()`.
- Added state: `hasMoreUsers`, `loadingMoreUsers`.
- Added `loadMoreUsers()`:
  - Uses `created_at` of last user as cursor with `.lt("created_at", cursor)`.
  - Dedupes by existing user ID set before appending.
  - Resolves avatar URLs for new users only.
- "Load more users" button shown when `hasMoreUsers` is true, disabled while loading.
- Client-side search continues to filter within the loaded set.

### Type check
- `npx tsc --noEmit` passes with zero errors.

---

## Test Checklist

- [ ] **Admin loads fast**: /app/admin initial load shows max 20 posts and 25 users
- [ ] **Posts - Load more**: clicking "Load more posts" appends older posts below existing ones
- [ ] **Posts - No duplicates**: load more does not create duplicate post cards
- [ ] **Posts - Attachments**: loaded-more posts show images/videos correctly (signed URLs)
- [ ] **Posts - Reactions**: loaded-more posts show correct reaction counts
- [ ] **Posts - Time filter**: changing time filter resets posts list and refetches first page
- [ ] **Posts - Audience filter**: audience filter still works on loaded set (client-side)
- [ ] **Posts - Selection**: select all / bulk delete works across paginated posts
- [ ] **Posts - Single delete**: deleting a single post removes it from the list
- [ ] **Posts - Button hidden**: "Load more posts" button disappears when fewer than PAGE_SIZE returned
- [ ] **Users - Load more**: clicking "Load more users" appends older users below existing ones
- [ ] **Users - No duplicates**: load more does not create duplicate user rows
- [ ] **Users - Avatars**: loaded-more users show correct avatar images
- [ ] **Users - Search**: client-side search filters within entire loaded set (including paginated)
- [ ] **Users - Disable/Enable**: toggling disable on a loaded-more user updates correctly
- [ ] **Users - Bulk disable**: bulk disable works across paginated users
- [ ] **Users - Button hidden**: "Load more users" button disappears when fewer than USER_PAGE_SIZE returned
- [ ] **Tutor management**: tutor role/listing save still works
- [ ] **Course assignment**: course assignment save still works
- [ ] **Non-admin**: non-admin user still sees "Not Authorized"
- [ ] **Type check**: `npx tsc --noEmit` passes with no new errors