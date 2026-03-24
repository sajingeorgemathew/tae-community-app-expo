# MOBILE-16E2 — Shared presence visuals + thread bottoming behavior

## Goal
Improve the mobile experience by:
1) adding shared presence visuals (green dot / active-state avatar indication) where appropriate
2) fixing message thread behavior so conversations reliably land near the latest messages instead of opening in the middle

## Why
The app already has presence/active-state concepts and polling-based status behavior, but the visual presence language is inconsistent across pages. Also, the message thread sometimes opens at an awkward middle point instead of the latest messages, which harms messaging UX.

## Scope
This ticket should cover:
1) Shared presence indicator visuals
2) Use of presence visuals on key surfaces
3) Message thread initial scroll / latest-message behavior
4) Preserve current messaging, faculty, and directory behavior

## Explicitly included
### Presence visuals
- green dot / active-state indicator on avatars where practical
- consistent visual treatment across key surfaces
- best-effort use of current presence/active state (not a new realtime system)

### Thread bottoming behavior
- when opening a conversation, the thread should land at/near the newest messages
- when sending a new message, the thread should stay aligned with the latest message
- avoid awkward opening in the middle of the conversation

## Explicitly NOT included
- No new realtime architecture in this ticket
- No backend migrations/policies
- No new notification system
- No final design/theming pass
- No giant refactor of messaging backend

## Important implementation note
Claude must inspect the current mobile presence logic and current message thread rendering behavior.

For presence:
- reuse the current available active-state/presence data if present
- do not invent a new backend presence model
- if some pages do not yet have cheap presence data access, prioritize the most valuable surfaces first and explain what was done

For thread behavior:
- inspect why the thread can open in the middle:
  - FlatList inversion issues
  - scroll-to-end timing issues
  - unstable keys/layout timing
  - initial render position issues
- fix it in a practical stable way

## Existing context
Already working:
- Messages conversation list
- Conversation thread
- text/media send
- Directory and Faculty cards
- avatar rendering
- current presence/heartbeat concepts exist in the project
- current polling-based active/counter behavior exists

## Expected behavior
### Presence visuals
Green-dot/avatar presence indicator should appear consistently where practical, for example:
- Messages conversation list
- Conversation header or participant avatar area
- Directory cards
- Faculty cards

### Messaging thread
- opening a conversation should show the latest messages
- sending a new message should keep view aligned to the latest message
- thread should feel stable and not jump awkwardly

## Technical constraints
- Do NOT change apps/web behavior in this monorepo except for reference inspection
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse current presence/message logic where practical
- Keep UI simple and stable, not final polished

## Files likely to touch
- apps/mobile/src/screens/MessagesScreen.tsx
- apps/mobile/src/screens/ConversationScreen.tsx
- apps/mobile/src/screens/DirectoryScreen.tsx
- apps/mobile/src/screens/FacultyScreen.tsx
- apps/mobile/src/components/* (likely avatar/member card/message row components)
- docs/tickets-mobile-16e2-presence-visuals-thread-bottoming.md

## Acceptance criteria
- Shared presence visual pattern appears on key surfaces
- Presence indicator does not break existing card layouts
- Conversation thread opens near the latest messages
- Sending messages keeps the thread aligned with latest messages
- Existing messaging/faculty/directory behavior remains stable
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
3) Confirm conversation list shows presence indicators where supported
4) Open a conversation
5) Confirm thread opens near the newest message
6) Send a message
7) Confirm thread stays at the bottom/latest message
8) Open Directory and Faculty
9) Confirm green-dot/avatar presence indicators appear where practical