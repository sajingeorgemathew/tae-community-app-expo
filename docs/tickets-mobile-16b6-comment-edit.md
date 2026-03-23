# MOBILE-16B6 — Comment owner edit parity

## Goal
Allow users to edit their own comments while preserving correct permission behavior:
- users can edit their own comments
- admins can edit only their own comments (not others)

## Why
Comment delete is already implemented with correct permissions. Edit is the final missing part of the comment ownership flow.

## Scope
This ticket should cover:
1) Add edit option for own comments
2) Implement edit comment flow
3) Update UI after edit
4) Preserve existing delete permissions

## Explicitly included
- Edit own comment
- Inline or screen-based edit flow
- UI refresh after success

## Explicitly NOT included
- No editing others’ comments (even for admin)
- No nested replies
- No moderation tools
- No backend migrations/policies

## Permission model
- Comment owner → can edit + delete
- Admin:
  - own comment → edit + delete
  - others' comments → delete only

## Existing context
Already working:
- Feed + Post Detail
- Comments list + add
- Comment delete (owner + admin)
- Feed preview comment rendering

## Expected behavior

### Comment UI
- Own comment shows actions (edit + delete)
- Other comments:
  - no edit
  - delete only if admin

### Edit flow
- user taps "Edit"
- comment switches to editable state (inline or screen)
- user updates text
- save triggers backend update
- UI refreshes

### Validation
- empty comment blocked
- trimmed input used

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Use real backend contract for comment update
- Keep UI simple and stable

## Files likely to touch
- apps/mobile/src/screens/PostDetailScreen.tsx
- apps/mobile/src/components/CommentItem.tsx (if exists)
- apps/mobile/src/lib/posts.ts (or comment helpers)
- docs/tickets-mobile-16b6-comment-edit.md

## Acceptance criteria
- User can edit own comment
- Admin cannot edit others’ comments
- Comment updates correctly after save
- Existing delete logic remains intact
- Feed preview updates correctly
- web typecheck passes
- mobile TypeScript passes

## Verification commands
- npm run web:typecheck
- npx tsc --noEmit

## Manual test
1) Sign in
2) Open post detail
3) Edit your comment
4) Save → updated
5) Try editing another user's comment → not allowed
6) As admin:
   - edit own comment → allowed
   - edit others → not allowed