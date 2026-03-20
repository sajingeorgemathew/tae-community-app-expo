# MOBILE-11 — New Post

## Goal
Add the ability for a signed-in user to create a new text post from the mobile app.

## Non-goals
- No post media upload in this ticket
- No edit/delete post
- No reactions/comments create flow
- No advanced composer UX
- No realtime updates

## Scope
This ticket should cover:
1) Add a New Post entry point from Feed
2) Create a NewPost screen
3) Allow entering text content and submitting a post
4) On success:
   - navigate back to Feed
   - refresh Feed so the new post appears
5) Handle loading/error/empty submission cleanly

## Existing context
Already working:
- auth/session
- Feed list + post detail
- mobile navigation stacks
- shared contract/types
- Supabase client in apps/mobile/src/lib/supabase.ts

## Expected behavior
### Feed
- Add a visible "New Post" action/button
- Tapping it opens a NewPost screen

### NewPost screen
- Text area / multiline input for post content
- Save/Post button
- Button disabled when content is empty/whitespace
- Basic cancel/back behavior

### Save behavior
- Insert a new post for the signed-in user
- On success:
  - return to Feed
  - Feed refreshes and shows the new post
- On failure:
  - show useful error
  - keep typed content intact

## Data contract
Use actual backend contract already present in repo:
- posts table
- author_id should be current auth user
- content/body column should match the real schema used by web/mobile code
- if status/visibility defaults exist in schema, rely on them rather than inventing values

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep implementation simple and stable
- Reuse current Feed stack/navigation if possible

## Files likely to touch
- apps/mobile/src/navigation/FeedStack.tsx
- apps/mobile/src/screens/FeedScreen.tsx
- apps/mobile/src/screens/NewPostScreen.tsx (new)
- apps/mobile/src/lib/posts.ts (optional helper)
- docs/tickets-mobile-11-new-post.md

## Acceptance criteria
- Signed-in user can open New Post screen
- Empty posts cannot be submitted
- Valid text post inserts successfully
- Feed updates after successful create
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
4) Enter text
5) Submit
6) Confirm return to Feed
7) Confirm new post appears
8) Verify empty submit is blocked