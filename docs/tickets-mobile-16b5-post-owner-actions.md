# MOBILE-16B5 — Post owner actions (edit/delete)

## Goal
Add post owner/admin actions to the mobile app so:
- a post owner can edit their own post
- a post owner can delete their own post
- an admin can delete any post, following the real backend contract

## Why
The feed now supports reading, creating, reactions, comments, and comment preview. The next major feed parity step is ownership/moderation actions.

## Scope
This ticket should cover:
1) Show edit/delete actions for the current user's own posts
2) Allow editing the text content of an owned post
3) Allow deleting an owned post
4) Allow admin users to delete any post
5) Keep feed/detail UI stable after edits/deletes

## Explicitly included
- Ownership-aware action menu on feed cards and/or post detail
- Edit own post
- Delete own post
- Admin delete any post
- UI refresh after success

## Explicitly NOT included
- No full moderation dashboard
- No media edit flow in this ticket
- No comment edit/delete unless Claude finds a very small, already-supported admin-delete path that naturally belongs here
- No backend migrations/policies
- No realtime updates
- No final visual polish

## Important implementation note
Claude must inspect the actual repo/backend contract and determine:
- how posts are updated/deleted in the current system
- what rules the backend already supports for:
  - owner update/delete
  - admin delete any post
- whether comments have a similar admin delete rule, and if so, whether that should be left for a later comment moderation ticket

Default scope decision:
- post edit/delete is REQUIRED
- admin delete-any-post is REQUIRED
- comment moderation is OPTIONAL and should only be included if very small and already clearly supported by the real contract

## Existing context
Already working:
- Feed list/detail
- New Post
- Feed filters
- Feed media preview/full-view
- Feed reactions
- Comment preview / comment flow
- Current user profile role is already available in mobile

## Expected behavior
### Feed / Post Detail
For owned posts:
- show a simple actions trigger (e.g. three dots / menu)
- allow Edit
- allow Delete

For admin users:
- show Delete on any post
- do not expose edit-anyone's-post unless the backend already clearly supports/admin uses it (not assumed)

### Edit flow
- open a simple edit screen or inline editor
- allow updating text content
- save via real backend contract
- refresh UI after success

### Delete flow
- confirmation prompt before delete
- delete succeeds
- post disappears from list/detail view after success

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse existing post helper/query logic where practical
- Keep UI simple and stable

## Files likely to touch
- apps/mobile/src/screens/FeedScreen.tsx
- apps/mobile/src/screens/PostDetailScreen.tsx
- apps/mobile/src/screens/EditPostScreen.tsx (new) or inline edit flow
- apps/mobile/src/components/PostCard.tsx
- apps/mobile/src/lib/posts.ts
- docs/tickets-mobile-16b5-post-owner-actions.md

## Acceptance criteria
- Post owner can edit own post
- Post owner can delete own post
- Admin can delete any post
- UI updates correctly after edit/delete
- Existing feed/comment/reaction flows remain stable
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Sign in as a normal user
2) Open an owned post
3) Edit it
4) Confirm update appears
5) Delete an owned post
6) Confirm it disappears
7) Sign in as admin if available
8) Confirm delete is available on another user's post
9) Confirm admin delete works