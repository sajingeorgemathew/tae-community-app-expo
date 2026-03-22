# MOBILE-16B3 — Feed reactions

## Goal
Add feed reaction support to the mobile app so users can react to posts and see reaction state/counts in Feed and Post Detail.

## Why
Reactions are the first real engagement layer for posts and are needed before comments/edit-delete parity. The feed is already functionally strong enough to support this next step.

## Scope
This ticket should cover:
1) Display reaction count on feed cards
2) Display current user's reaction state if supported by the backend contract
3) Allow the current user to add/remove a reaction on a post
4) Keep Post Detail consistent with Feed where practical

## Explicitly included
- Read reaction count/state
- Toggle reaction on/off for current user
- Update UI after success
- Keep the experience simple and stable

## Explicitly NOT included
- No comments in this ticket
- No post edit/delete
- No multi-step reaction picker unless clearly supported/required by current contract
- No realtime reaction updates
- No backend migrations/policies
- No final visual polish

## Important implementation note
Claude must inspect the real repo/backend contract and determine:
- how reactions are stored
- whether there is a `post_reactions` table or equivalent
- whether reactions are boolean-like or typed (e.g. like/love/etc.)
- how the web app currently reads/writes reactions

If the real backend contract only supports a simple "like", implement that.
Do not invent a more complex reaction system if it does not already exist.

## Existing context
Already working:
- Feed list
- Post detail
- New Post
- Feed filters
- Feed media preview/full-view
- My Posts preview in Me

## Expected behavior
### Feed card
Should show:
- reaction count (best effort)
- a reaction button/state for the current user

### Post Detail
Should also show consistent reaction behavior if practical.

### Interaction
- Tapping the reaction button toggles the user's reaction
- Count updates after success
- Current user's reacted state is reflected visually

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse existing post queries/helpers/routes where practical
- Keep UI simple and stable

## Files likely to touch
- apps/mobile/src/screens/FeedScreen.tsx
- apps/mobile/src/screens/PostDetailScreen.tsx
- apps/mobile/src/components/PostCard.tsx (or equivalent reusable feed card component)
- apps/mobile/src/lib/posts.ts
- docs/tickets-mobile-16b3-feed-reactions.md

## Acceptance criteria
- Feed shows reaction count/state
- User can toggle reaction on/off
- Count/state updates correctly
- Post Detail remains stable
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
3) Tap reaction on a post
4) Verify state/count updates
5) Tap again if toggle-off is supported
6) Open Post Detail
7) Verify reaction state remains consistent