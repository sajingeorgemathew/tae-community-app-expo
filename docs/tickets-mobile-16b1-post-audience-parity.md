# MOBILE-16B1 — New Post audience/filter parity

## Goal
Bring the mobile New Post flow closer to the web app by adding audience/filter selection before submitting a post.

## Why
The web app supports audience/filter-like posting options (for example All / Students / Alumni). The mobile composer currently only supports text content. We need parity for the saved post audience/visibility behavior before deeper feed interactions.

## Scope
This ticket should cover:
1) Add audience/filter selection UI to the New Post screen
2) Load/save the selected audience/filter into the real post schema used by the backend
3) Preserve existing text-only post creation flow
4) Keep the implementation stable and simple

## Explicitly included
- Add a selectable audience/filter control on the New Post screen
- Support web-aligned options if they exist in the current contract, for example:
  - All
  - Students
  - Alumni
- Save the selected value using the real field already used by the backend/web app if such a field exists
- If the web app uses a different naming/shape, mobile should follow the real contract rather than inventing a new one

## Explicitly NOT included
- No media upload in this ticket
- No post edit/delete
- No reactions/comments
- No feed filtering UI yet
- No backend migrations/policies
- No final visual polish

## Important implementation note
Claude must inspect the actual repo/backend contract and determine:
- whether posts currently have an audience/visibility field
- what exact values the web app uses
- whether the mobile composer should save a field directly on `posts` or some equivalent contract value

If no such field exists in the current real backend contract, Claude should:
- not invent a fake schema
- implement a safe placeholder/select UI only if it can be clearly marked as TODO
- but first try hard to match the real web contract

## Existing context
Already working:
- Feed list
- Post detail
- New Post text composer
- My Posts preview in Me
- Home recent posts preview

## Expected behavior
### New Post screen
Should now include:
- multiline content input
- audience/filter selection control
- submit button

### Save behavior
- Empty content still blocked
- Submit inserts post successfully
- Audience/filter value is saved correctly if supported by backend
- Feed continues to work after post creation

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Keep UI simple and stable
- Reuse current NewPost screen and post helper logic where practical

## Files likely to touch
- apps/mobile/src/screens/NewPostScreen.tsx
- apps/mobile/src/lib/posts.ts
- docs/tickets-mobile-16b1-post-audience-parity.md

## Acceptance criteria
- New Post screen shows audience/filter selection
- Existing text post create still works
- Selected audience/filter is persisted correctly if supported by backend
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
3) Tap New Post
4) Select an audience/filter option
5) Enter text content
6) Submit
7) Confirm post is created successfully
8) If possible, verify saved audience/filter matches backend behavior