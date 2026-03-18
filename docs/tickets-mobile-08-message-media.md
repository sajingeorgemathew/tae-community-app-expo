# MOBILE-08 — Message media attachment send

## Goal
Add message media attachment sending to the mobile Conversation screen:
- Pick an image/file from device
- Upload it to the correct Supabase Storage path
- Create the corresponding message/message attachment records as required by the existing backend contract
- Render the uploaded attachment in the thread after send

## Non-goals
- No camera capture requirement
- No audio/video recording
- No drag/drop or advanced gallery UX
- No realtime updates
- No attachment deletion in this ticket

## Scope
This ticket should cover:
1) Attachment picker from device
2) Upload to message media bucket using existing shared storage strategy
3) Create message + attachment linkage according to current schema/backend
4) Show attachment in the thread after successful send
5) Basic loading/error states

## Requirements
- Reuse existing Conversation screen from MOBILE-07
- Use the existing Supabase client in apps/mobile/src/lib/supabase.ts
- Use shared storage helpers from @tae/shared where practical
- Follow the existing storage path conventions and schema rules already established in EXPO-03 and repo contract docs
- Keep implementation stable and simple

## Expected behavior
### Conversation screen
- Existing text composer remains
- Add an attachment button near the composer
- User can pick a file/image
- Selected attachment uploads and appears in the conversation after send

### Sending rules
- Text-only message should still work
- Attachment-only message should work if backend allows
- Text + attachment should work if backend allows
- If backend requires message row first, create message first, then upload/link attachment
- If backend requires storage path to include messageId, follow that exact sequence

## Data contract
Use actual repo/backend contract:
- messages table
- message_attachments table (if present)
- message media storage bucket/path conventions
- sender_id = auth.uid()
- conversation_id = current route param

## Technical constraints
- Do not modify apps/web
- No backend migration/policy changes in this ticket
- Use expo-compatible picker (e.g. expo-image-picker or expo-document-picker, whichever Claude finds most appropriate for current implementation)
- Keep keyboard/input layout stable

## Files likely to touch
- apps/mobile/src/screens/ConversationScreen.tsx
- apps/mobile/src/lib/messages.ts (optional helper)
- apps/mobile/package.json
- docs/tickets-mobile-08-message-media.md

## Acceptance criteria
- Signed-in user can pick a media/file attachment in a conversation
- Upload succeeds
- Corresponding message/thread item appears
- Existing text send still works
- TypeScript passes in mobile
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
4) Pick an attachment
5) Send it
6) Verify it appears in thread
7) Verify plain text send still works