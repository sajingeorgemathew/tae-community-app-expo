# MOBILE-06 — Messages list + conversation thread

## Goal
Implement the first real messaging flow in the Expo app:
- Messages tab shows the user’s conversations list
- Tapping a conversation opens the thread screen
- Thread screen shows existing messages read-only
- If message attachments exist, render them when possible

## Non-goals
- No send-message composer yet
- No create new conversation flow yet
- No realtime/polling improvements yet
- No message reactions/edit/delete UI

## Scope
This ticket should only cover:
1) Conversations list screen
2) Conversation thread screen
3) Route wiring from Messages tab to thread detail
4) Read-only rendering of messages + basic attachments

## Data requirements
Use the existing Supabase backend and shared contract layer:
- conversation_members
- conversations
- messages
- message_attachments (if used by current schema/RPC)
- shared storage helpers for signed URLs if attachment bucket is private

## Expected navigation structure
Messages tab should become a stack:
- MessagesListScreen
- ConversationScreen (param: conversationId)

## UI expectations
### Messages list
Each row should show:
- other participant name (or safe fallback)
- latest message preview if available
- updated/created time if available
- avatar if available

### Conversation thread
Should show:
- header with participant name (best effort)
- message bubbles in a simple list
- sent vs received alignment if easy
- attachment preview if image exists
- loading / empty / error states

## Technical constraints
- Do not modify apps/web
- Keep implementation simple and stable
- No polling loop unless already required by current code
- No new backend changes
- Use @tae/shared types/helpers where practical

## Files likely to touch
- apps/mobile/src/navigation/AppTabs.tsx
- apps/mobile/src/navigation/MessagesStack.tsx (new)
- apps/mobile/src/screens/MessagesScreen.tsx (replace placeholder)
- apps/mobile/src/screens/ConversationScreen.tsx (new)
- apps/mobile/src/lib/messages.ts (optional helper)
- docs/tickets-mobile-06-messages-thread.md

## Acceptance criteria
- Signed-in user can open Messages tab
- Conversations list loads without crashing
- Tapping a conversation opens thread screen
- Existing messages render
- web typecheck still passes
- mobile TypeScript check still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual testing
1) Sign in on Expo Go
2) Open Messages tab
3) Open a conversation
4) Verify thread renders
5) Go back to list