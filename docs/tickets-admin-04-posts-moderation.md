# ADMIN-04 — Posts moderation

## Goal
Implement the mobile admin posts moderation surface so admins can review and delete posts from a dedicated moderation screen.

## Why
The admin system now has shell/member/instructor foundations. The next major admin function is content moderation. Mobile needs a practical posts moderation screen before dashboard summary and later bulk moderation features.

## Scope
This ticket should cover:
1) admin-only posts moderation screen
2) post list for moderation
3) single-post delete with confirmation
4) practical filters/search if already supported by current contract
5) clear success/error/loading states

## Explicitly included
### Posts moderation list
- admin-only screen accessible from Admin shell
- list of posts suitable for moderation
- key post context shown, such as:
  - author
  - created time
  - content preview
  - audience if available
  - media preview if already practical

### Moderation action
- delete a post from moderation screen
- confirmation prompt before delete
- UI refresh after successful delete

### Optional if practical
- simple audience filter
- simple search/filter by author/content
- basic empty/loading/error states

## Explicitly NOT included
- No bulk delete in this ticket
- No delete-by-user batch flow
- No moderation analytics
- No backend migrations/policies
- No apps/web behavior changes
- No final visual polish
- No realtime moderation updates

## Important implementation note
Claude must inspect the real current backend/admin/post contract and determine:
- how admin delete on posts is currently supported
- what post data can be queried cleanly for moderation
- whether current mobile post card components can be reused safely
- whether audience and media metadata are already cheaply available

Claude should prefer a practical moderation list over a perfect web clone.
Single-post moderation is the required target here.

## Existing context
Already working:
- admin shell
- feed/post system
- post owner/admin delete patterns elsewhere in mobile
- media preview/full-view behavior
- current auth/admin role logic

## Expected behavior
### Admin shell
- Posts Moderation card opens a real moderation screen

### Moderation screen
- admin sees posts list
- each entry gives enough context to decide whether to delete
- delete action is available
- confirmation prevents accidental deletion
- list updates after successful delete

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse current post rendering/helpers where practical
- Keep UI simple and stable, not final polished

## Files likely to touch
- apps/mobile/src/screens/AdminScreen.tsx
- apps/mobile/src/screens/AdminPostsModerationScreen.tsx (new)
- apps/mobile/src/navigation/* (admin route wiring)
- apps/mobile/src/lib/posts.ts or admin helper module
- docs/tickets-admin-04-posts-moderation.md

## Acceptance criteria
- Admin can open Posts Moderation from Admin shell
- Posts list renders in moderation screen
- Admin can delete a post with confirmation
- UI updates after successful delete
- Existing feed/admin behavior remains stable
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Sign in as admin
2) Open Admin
3) Open Posts Moderation
4) Verify posts list renders
5) Delete a post with confirmation
6) Confirm it disappears from moderation list
7) Confirm app remains stable