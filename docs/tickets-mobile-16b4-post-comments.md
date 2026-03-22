# MOBILE-16B4 — Post comments

## Goal
Add post comments support to the mobile app so users can read and add comments on posts.

## Why
Comments are the next key engagement layer after reactions and are required for stronger feed parity. The feed is now ready for the comment loop.

## Scope
This ticket should cover:
1) Display comment count on feed cards if supported by the current query shape
2) Show comments on Post Detail
3) Allow the signed-in user to add a comment to a post
4) Refresh/update comments after a successful add

## Explicitly included
- Read existing comments
- Add a new comment
- Display comment count if practical
- Keep Post Detail as the primary place for comments

## Explicitly NOT included
- No comment edit/delete
- No nested replies
- No realtime comment updates
- No post edit/delete
- No backend migrations/policies
- No final visual polish

## Important implementation note
Claude must inspect the real repo/backend contract and determine:
- where comments are stored
- how the web app reads/writes comments
- whether feed cards already receive comment counts cheaply
- what actual columns are used for comment content and author linkage

If the backend contract only supports a simple flat comment model, implement that.
Do not invent nested reply structures if they do not already exist.

## Existing context
Already working:
- Feed list
- Post detail
- New Post
- Feed filters
- Feed media preview/full-view
- Feed reactions

## Expected behavior
### Feed card
Should show comment count if already available cheaply from current data contract.
If not, it is acceptable to keep comment count limited to Post Detail in this ticket.

### Post Detail
Should show:
- post content/media
- comments list
- add-comment input
- loading / empty / error states

### Comment interaction
- Signed-in user can type and submit a comment
- Empty comment is blocked
- After success:
  - comment appears in the list
  - count updates if shown

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse existing post detail route and post helpers where practical
- Keep UI simple and stable

## Files likely to touch
- apps/mobile/src/screens/PostDetailScreen.tsx
- apps/mobile/src/screens/FeedScreen.tsx (only if comment count is surfaced there)
- apps/mobile/src/components/PostCard.tsx (if comment count is shown there)
- apps/mobile/src/lib/posts.ts
- docs/tickets-mobile-16b4-post-comments.md

## Acceptance criteria
- Post Detail shows comments
- Signed-in user can add a comment
- Empty comment is blocked
- Comment appears after successful submit
- Existing feed/post flows remain stable
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Sign in
2) Open Feed
3) Open a post detail
4) Verify comments list loads
5) Add a comment
6) Confirm it appears
7) Reopen the same post and confirm comment persists