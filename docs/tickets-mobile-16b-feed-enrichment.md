# MOBILE-16B — Feed enrichment

## Goal
Enrich the mobile Feed so it feels closer to the web app’s feed experience while staying stable and simple.

## Why
The Feed already works functionally, but it still lacks richer card presentation and metadata compared to the web app. This ticket improves the Feed experience without overbuilding reactions/comments logic yet.

## Scope
This ticket should enrich:
1) feed list cards
2) post detail display where it makes sense to keep consistency
3) loading / empty / error states
4) attachment preview handling

## Explicitly included
- Better feed card presentation:
  - author name
  - created date/time
  - content preview / body display
  - attachment preview if available
- Better metadata display where already available cheaply:
  - reaction count (display only, if already queryable)
  - comment count (display only, if already queryable)
- Cleaner empty states and loading states
- Reuse/improve post card rendering so Feed and My Posts can stay visually consistent later

## Explicitly NOT included
- No reaction create flow
- No comment create flow
- No comment edit/delete
- No post edit/delete
- No feed realtime
- No major design-polish/theming pass yet

## Important note on scope
If comment/reaction counts are not already available cheaply from the current query shape, keep them omitted or as placeholders. Do not overbuild query complexity in this ticket.

## Existing context
Already working:
- Feed list
- Post detail
- New Post
- My Posts preview in Me
- signed URL handling for post attachments

## Expected behavior
### Feed screen
Should now feel richer:
- improved card layout
- clearer author/date/content hierarchy
- better preview of attachments
- stable rendering for text-only and media posts

### Post detail
May be lightly improved for consistency if needed, but Feed remains the primary focus.

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse existing post queries/helpers/routes
- Keep UI simple and stable; not final polished

## Files likely to touch
- apps/mobile/src/screens/FeedScreen.tsx
- apps/mobile/src/screens/PostDetailScreen.tsx (if consistency improvements are needed)
- apps/mobile/src/components/* (optional shared post card component if Claude chooses)
- apps/mobile/src/lib/posts.ts (optional helper refinement)
- docs/tickets-mobile-16b-feed-enrichment.md

## Acceptance criteria
- Feed cards feel richer and clearer
- Attachment previews render safely
- Loading/empty/error states are improved
- Existing new post flow still works
- Existing post detail route still works
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
3) Verify richer feed cards render
4) Verify text-only posts look clean
5) Verify media posts preview correctly
6) Tap a post
7) Verify post detail still works