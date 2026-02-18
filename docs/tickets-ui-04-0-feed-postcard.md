# UI-04.0 Feed Redesign + Shared PostCard

## Goal
Redesign /app/feed with premium white/navy theme and create a shared PostCard component used in:
- /app/feed
- /app/profile/[id] posts section
(Optionally: dashboard recent posts if it renders posts)

## Inspiration
docs/feed.png is visual inspiration only.
Ignore anything not present in our app.

## Critical Rule
Preserve all existing behavior:
- fetching feed posts (filters, audience, time range)
- attachments rendering (images/videos/links)
- reactions add/remove logic
- comments load/submit/edit/delete logic
- delete post permissions (author/admin)
- profile navigation links
- presence dots if shown
- no DB changes, no RPC changes

UI/layout + component extraction only.

## Requirements

### PostCard component (shared)
- Author row:
  - Avatar + presence dot if available
  - Author name (click -> /app/profile/[id])
  - Time stamp
  - Audience pill (if shown)
  - Optional: more/menu for delete (only if currently supported)
- Content body typography
- Attachments:
  - Images as grid thumbnails
  - Video as clean player
  - Links as preview card (if currently exists)
- Action row:
  - Reaction buttons (existing emojis)
  - Comment toggle
  - Counts (reactions/comments)
- Comments section:
  - Existing comment list + edit/delete controls
  - New comment input
- Loading/empty/error states consistent with app

### Feed page layout
- Header: "Feed" + subtitle
- "New Post" button prominent
- Filters (if exist): audience + date range, styled as pills/select
- Full-width responsive container

### Profile posts reuse
- In /app/profile/[id], posts render using the same PostCard component with same visuals.

## Acceptance
- No behavior regressions
- All actions work: post, react, comment, delete
- Profile links work
- Same PostCard style appears in feed + profile posts
- No console errors

---

## Implementation Notes

### Files Changed
1. **src/components/PostCard.tsx** — Restyled with premium white/navy theme:
   - Rounded-xl card with subtle shadow and border
   - Author header: larger avatar, bold name (link to profile), audience pill, timestamp below
   - Three-dot dropdown menu for delete (replaces plain text "Delete" button)
   - Content with relaxed leading and proper padding
   - Attachments with rounded-lg corners, link icon for link attachments
   - Reaction pills as rounded-full buttons with active blue state
   - Comment toggle button in action row (right-aligned)
   - Comments section: "COMMENTS" label, textarea input with "Post Comment" button, styled comment cards
   - All logic (queries, mutations, state management) **unchanged**

2. **src/app/app/feed/page.tsx** — Redesigned layout:
   - Page header bar with back chevron, "Feed" title, subtitle
   - Controls bar: rounded-full filter pills (dark active state) + "New Post" CTA button
   - max-w-3xl centered container for posts
   - Empty state with icon, message, and CTA
   - Loading spinner matching app style
   - All fetching, ranking, filtering, delete, reaction logic **unchanged**

3. **src/app/app/profile/[id]/page.tsx** — Profile posts area updated:
   - Removed outer white card wrapper from posts section (PostCard now has its own card styling)
   - Kept section header with indicator bar + "Create Post" link
   - Switched from `<ul>/<li>` to `<div>` (PostCard cards are self-contained)
   - Empty state kept in its own card
   - All profile layout from UI-03.9 **preserved**

### What Was NOT Changed
- No database schema changes
- No migration files
- No RLS policy changes
- No query semantic changes (same tables, same filters, same ordering)
- No state variable renames
- No handler function renames
- Avatar.tsx unchanged
- avatarUrl.ts hook unchanged
- PostCard prop interface unchanged (same exports: Attachment, Emoji, EMOJI_SET, ReactionCounts)

## Testing Steps

### Feed Page (/app/feed)
1. Navigate to /app/feed — page loads with premium header, filter pills, and post cards
2. Click filter pills (All / Students / Alumni) — posts filter correctly
3. Click "New Post" — navigates to /app/feed/new
4. Click back arrow — navigates to /app
5. Create a post, return to feed — new post appears at top
6. Click author name on a post — navigates to /app/profile/[id]
7. Click reaction emoji — count increments, button highlights blue
8. Click same emoji again — count decrements, button returns to gray
9. Click "Comment" — comments section expands with input
10. Type a comment and press Enter or click "Post Comment" — comment appears
11. Click "Edit" on own comment — edit textarea appears, save works
12. Click "Delete" on own comment — confirmation dialog, comment removed
13. Click three-dot menu on own post (or admin) — dropdown with "Delete" option
14. Click "Delete" from menu — confirmation dialog, post removed from feed
15. Check that non-author/non-admin posts don't show three-dot menu
16. Post with image attachment — image renders with rounded corners
17. Post with video attachment — video player renders
18. Post with link attachment — link renders with link icon
19. No console errors in browser dev tools

### Profile Page (/app/profile/[id])
1. Navigate to a profile with posts — posts render with same PostCard styling
2. Reactions work on profile posts
3. Comments expand and work on profile posts
4. Delete works for own posts / admin
5. Profile layout (left column card + right column) unchanged from UI-03.9
6. Empty posts state shows card with CTA
7. No console errors

### Cross-Cutting
- PostCard looks identical in feed and profile contexts
- Responsive layout works on mobile/tablet
- Build passes with no TypeScript errors
