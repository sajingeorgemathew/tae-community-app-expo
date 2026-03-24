# MOBILE-16E1 — Messaging UX enrichment

## Goal
Enrich the mobile messaging experience so it feels closer to the web app in day-to-day usage, while keeping the current backend contract and non-realtime architecture intact.

## Why
Messaging is already functionally working, but the UI/UX still needs improvement:
- conversation list can be richer
- thread presentation can be clearer
- message preview/meta behavior can be improved
- composer and empty/loading states can feel more polished
This should be addressed before presence/realtime work.

## Scope
This ticket should cover:
1) Conversation list UX enrichment
2) Message thread UX enrichment
3) Better preview/metadata handling
4) Better empty/loading/error states
5) Better message composer UX
6) Keep all current messaging behavior stable

## Explicitly included
### Conversation list
- richer conversation cards
- avatar + display name presentation
- latest message preview
- timestamp presentation
- unread preview/badge if already available cheaply from current contract
- cleaner empty/loading/error states

### Message thread
- clearer message bubble presentation
- clearer sent vs received distinction
- cleaner spacing/author/time treatment where appropriate
- media attachment presentation remains stable
- keyboard-safe composer remains intact or is improved

### Composer UX
- keep text composer stable
- improve usability/layout if needed
- preserve media attachment sending
- preserve existing send behavior

## Explicitly NOT included
- No realtime messaging yet
- No new presence system yet
- No backend migrations/policies
- No message reactions
- No giant redesign/theming pass
- No notification system changes

## Important implementation note
Claude must inspect the current mobile implementation and the monorepo web implementation to identify the biggest UX gaps in messaging.

Claude should prioritize:
- practical parity
- cleaner information hierarchy
- stable composer behavior
- conversation list usability

If unread counts/previews are already available from the existing query contract, show them.
If they are not cheaply available, do not overbuild them here.

## Existing context
Already working:
- conversation list
- conversation thread
- text send
- media send
- current auth/user context
- current messaging navigation

## Expected behavior
### Conversation list
Should feel richer and clearer:
- avatar
- display name
- latest message preview
- timestamp
- unread indication if practical
- cleaner row layout

### Thread
Should feel clearer:
- sent vs received messages visually distinct
- media attachments remain usable
- composer remains keyboard-safe and stable
- overall spacing/readability improves

### Composer
- stays usable near keyboard
- remains stable after sends
- media send remains intact

## Technical constraints
- Do NOT change apps/web behavior in this monorepo except for reference inspection
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse current conversation/message helpers where practical
- Keep UI simple and stable, not final polished

## Files likely to touch
- apps/mobile/src/screens/MessagesScreen.tsx
- apps/mobile/src/screens/ConversationScreen.tsx
- apps/mobile/src/components/* (likely reusable conversation row or message bubble improvements)
- apps/mobile/src/lib/messages.ts (only if preview/meta helpers need refinement)
- docs/tickets-mobile-16e1-messaging-ux-enrichment.md

## Acceptance criteria
- Conversation list feels richer and clearer
- Thread presentation is improved
- Composer remains usable and keyboard-safe
- Existing send/media behavior still works
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
2) Open Messages
3) Verify richer conversation rows render
4) Open a conversation
5) Verify thread is clearer and stable
6) Send a text message
7) Send media if available
8) Confirm keyboard/composer behavior remains usable