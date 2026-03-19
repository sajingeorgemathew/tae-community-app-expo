# MOBILE-08A — Fix message media send flow (prevent blank rows)

## Parent ticket
Follow-up to: MOBILE-08 — Message media attachment send

## Goal
Fix the attachment send flow in mobile messaging so failed attachment sends do NOT leave behind blank/ghost message rows.

## Current bug
When sending a message with an attachment:
- the app appears to create a message row
- attachment upload or linkage fails
- the conversation then shows timestamp-only rows with no visible content/attachment

This suggests the send flow is not atomic and is allowing partial success.

## Desired behavior
Attachment sending must be safe:
- If attachment upload/linking fails, do NOT leave an empty message row behind.
- If the backend requires creating a message row first, then on failure:
  - rollback/delete the just-created empty message row, OR
  - prevent save unless the message has valid content and attachment linkage succeeds.
- Text-only send must continue to work.
- Attachment-only send should only be allowed if the backend contract supports it.
- Empty/whitespace-only sends must be blocked.

## Non-goals
- No new conversation creation flow
- No realtime
- No media deletion UI
- No backend migration/policy changes unless absolutely required (prefer app-layer fix)

## Scope
This ticket should cover:
1) Diagnose the actual MOBILE-08 send sequence
2) Fix the send sequence so it is effectively atomic from the user’s perspective
3) Prevent creation of ghost/timestamp-only messages
4) Improve error handling so failed attachment sends show a useful error and do not silently partially succeed

## Technical expectations
Claude must inspect the current code and determine which of these is the real current flow:
- create message first → upload → insert attachment link
- upload first → create message → insert attachment link
- another variation

Then choose the safest fix based on actual backend constraints.

### Preferred outcomes
#### If attachment path does NOT require messageId:
- Upload attachment first
- If upload succeeds:
  - create message row
  - create attachment link row
- If upload fails:
  - do not create message row

#### If attachment path DOES require messageId:
- Create message row first
- Upload attachment
- Insert attachment link
- If upload or link fails:
  - rollback/delete the just-created message row if it is empty and belongs to this failed send attempt

## Additional guardrails
- Do not allow send if:
  - trimmed text is empty
  - and there is no successfully prepared attachment payload
- If attachment-only messages are unsupported by schema/UX, block them clearly
- Existing text send from MOBILE-07 must still work

## Files likely to touch
- apps/mobile/src/screens/ConversationScreen.tsx
- apps/mobile/src/lib/messages.ts (if helper exists or is created)
- docs/tickets-mobile-08a-message-media-fix.md

## Acceptance criteria
- Sending attachment no longer creates ghost/blank messages
- Failed attachment upload does not leave orphan UI rows
- Text-only send still works
- If attachment send fails, user sees a useful error
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual testing
1) Sign in
2) Open Messages
3) Open a conversation
4) Try plain text send -> should still work
5) Try attachment send -> should succeed OR fail cleanly
6) On failure, confirm no new blank row appears
7) Reopen thread and verify no fresh timestamp-only ghost rows are created