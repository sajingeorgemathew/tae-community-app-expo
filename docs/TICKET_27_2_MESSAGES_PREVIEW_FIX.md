Ticket 27.2 — Messages preview fix (attachments + empty content)

Goal
Conversation list should never show “No messages yet” when the last message exists but has no text (attachment-only message).

Current Problem

If User A sends an image/video with content = null, User B sees “No messages yet” in the conversation list.

This is because the preview UI relies on last_message_content only.

Scope

Update get_my_conversations() RPC:

Return a safe preview string even when last message content is null.

Prefer:

if last message exists and content is null → "📎 Attachment"

(optional) if last message has attachment type: image/video → "📷 Photo" / "🎥 Video"

Keep ordering by most recent activity.

Update messages list UI (/app/messages):

If preview is null/empty, show "📎 Attachment" instead of “No messages yet”.

Ensure conversation moves to top when a new message (text or attachment-only) is sent.

No Realtime

No Supabase Realtime changes.

Polling will be handled in a later ticket.

Files expected

supabase/migrations/*_ticket27_2_update_get_my_conversations.sql (or similar)

src/app/app/messages/page.tsx

Done when

Send an attachment-only message from A → B.

B sees the conversation preview as "📎 Attachment" (or Photo/Video) and not “No messages yet”.

Refreshing /app/messages shows correct preview and ordering.