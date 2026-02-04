Ticket 26 — Messaging UI v1 (read + send text)
Goal

Enable 1:1 private messaging UI:

list conversations

open a conversation

send text messages

show messages in correct order

only members can access (RLS enforces)

Routes
/app/messages

Split view:

Left: conversation list

Right: active conversation thread

URL param: ?c=<conversation_id> selects active conversation

Data rules

Conversation list:

show conversations where current user is a member

show other participant name (fetch via conversation_members → profiles)

show last message preview + timestamp (simple for now)

Thread:

fetch messages for selected conversation ordered by created_at asc

show my messages aligned right, others left

sender name optional (can omit if styling clear)

Send message

textbox + Send button

on send:

insert into messages (conversation_id, sender_id, content)

clear input

append optimistically OR refetch after insert (MVP can refetch)

Content must not be empty (trim)

Permissions

If c is not a conversation the user belongs to:

show “Not authorized” (or “Conversation not found”)

do not crash

Done when

/app/messages shows conversation list

clicking a conversation opens thread

can send a message, it appears immediately

refresh persists and loads messages

npm run build passes

Notes

Text-only (no attachments yet)

No realtime yet (polling optional later)

