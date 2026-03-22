# MOBILE-16B1A — Feed filter parity

## Goal
Bring the mobile Feed page in line with the web app’s feed filter logic by adding filter controls and using the real backend-supported audience/filter behavior.

## Why
The mobile New Post flow now allows selecting an audience/filter option before creating a post. But the Feed page still does not expose or apply the corresponding filter logic. This means the data loop is incomplete.

## Scope
This ticket should cover:
1) Add feed filter UI to the mobile Feed screen
2) Use the real backend/web-supported audience/filter values
3) Update the Feed query so the selected filter actually changes which posts are shown
4) Keep the implementation stable and simple

## Explicitly included
- Feed filter UI on the Feed screen
- Filter options aligned with the real web/backend contract
- Filter state changes update the fetched/rendered posts
- Existing Feed cards and Post Detail continue to work

## Explicitly NOT included
- No media preview fitting changes in this ticket
- No reactions create flow
- No comments create flow
- No post owner edit/delete
- No realtime updates
- No backend migrations/policies
- No final visual polish

## Important implementation note
Claude must inspect the actual repo/backend contract and determine:
- what filter options the web app uses
- whether filtering is done by a field on `posts`, by viewer eligibility logic, or another existing contract
- how to reproduce that logic safely in mobile

If the web app uses a non-trivial filter flow:
- follow the real contract as closely as possible
- do not invent fake backend logic
- explain any approximation clearly in the summary

## Existing context
Already working:
- Feed list
- Post detail
- New Post with audience/filter selection
- Home recent posts preview
- My Posts preview in Me

## Expected behavior
### Feed screen
Should now include a filter control such as:
- All
- Students
- Alumni

(or the real options from the repo/backend contract)

### Filter behavior
- Changing the filter updates the Feed list
- Selected filter persists for the current screen session
- Existing post card rendering remains stable
- Empty/loading/error states remain clean

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Keep UI simple and stable
- Reuse current Feed screen/query logic where practical

## Files likely to touch
- apps/mobile/src/screens/FeedScreen.tsx
- apps/mobile/src/lib/posts.ts
- docs/tickets-mobile-16b1a-feed-filter-parity.md

## Acceptance criteria
- Feed screen shows filter UI
- Filter options reflect the real backend/web-supported values
- Changing the filter changes which posts are shown
- Existing New Post flow still works
- Existing Post Detail flow still works
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
3) Verify filter UI appears
4) Switch between filter options
5) Confirm Feed results change appropriately
6) Open a post detail
7) Confirm it still works
8) Create a new post with a selected audience if needed and verify Feed behavior remains coherent