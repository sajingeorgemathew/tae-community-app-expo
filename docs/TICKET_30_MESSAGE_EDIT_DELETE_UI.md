Ticket 30 — Delete + Edit own messages (UI)

Goal
Allow sender to edit and delete their own messages from the conversation thread (WhatsApp-style minimal).

Scope

Route: /app/messages (single UI file currently: src/app/app/messages/page.tsx)

Add UI affordances per message bubble (only for own messages):

Edit (pencil) → inline edit mode (textarea)

Save / Cancel

Delete (trash) → confirm then delete

Permissions:

Only sender can edit/delete (UI check + DB RLS enforcement)

Keep minimal, no redesign:

actions appear on hover or as small icons near message

show “(edited)” if message has been edited (use updated_at if available or track locally)

Data requirements

Delete: already supported by DB policy (sender-only).

Edit: requires UPDATE policy on messages table (sender-only).

If UPDATE not already enabled in Ticket 24: add migration to enable sender-only update:

policy: sender_id = auth.uid()

allow update of content (and set updated_at=now() if column exists)

Done when

Sender can delete a message and it disappears immediately (optimistic ok).

Sender can edit a message and updated text shows immediately.

Non-sender cannot see edit/delete buttons on others’ messages.

Polling does not cause flicker or revert edits.

npm run build passes.
