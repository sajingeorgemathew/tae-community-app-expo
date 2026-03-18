# MOBILE-07 — Send message composer

## Goal
Add a text message composer to the mobile Conversation screen so a signed-in user can send messages in an existing conversation.

## Non-goals
- No media attachment sending yet
- No new conversation creation flow yet
- No realtime subscription yet
- No message editing/deleting UI
- No advanced optimistic UI beyond simple local refresh

## Scope
This ticket should only cover:
1) Message input composer in Conversation screen
2) Sending text messages into the existing conversation
3) Refreshing the thread after send
4) Basic disabled/loading/error behavior

## Requirements
- Use the existing Supabase client in apps/mobile/src/lib/supabase.ts
- Reuse the existing Conversation screen from MOBILE-06
- Use current authenticated user from auth state
- Keep implementation stable and simple

## Expected behavior
### Conversation screen
- Existing messages still render as before
- Bottom composer contains:
  - text input
  - send button
- Send button disabled when:
  - input is empty/whitespace
  - message is currently sending
- After successful send:
  - input clears
  - thread refreshes
  - new message appears in list

## Data contract
Use current schema/backend behavior:
- messages table insert
- sender_id = auth.uid()
- conversation_id = current route param
- content/body/text field should match existing schema
- if current schema uses a different message column name, follow existing contract discovered in repo

## Technical constraints
- Do not modify apps/web
- Do not add polling loops
- Do not add media upload logic
- Do not add new backend policies/migrations in this ticket
- Keep keyboard behavior reasonable on mobile (basic keyboard avoiding if easy)

## Files likely to touch
- apps/mobile/src/screens/ConversationScreen.tsx
- apps/mobile/src/lib/messages.ts (optional helper)
- apps/mobile/src/state/auth.tsx (only if needed)
- docs/tickets-mobile-07-send-message.md

## Acceptance criteria
- Signed-in user can type a message in Conversation screen
- Pressing send inserts the message successfully
- Thread refreshes and shows the new message
- Empty messages cannot be sent
- Mobile TypeScript passes
- web typecheck still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Sign in
2) Open Messages
3) Open a conversation
4) Type a text message
5) Tap Send
6) Verify the message appears
7) Verify empty send is blocked