Ticket 38.2 — Messages: show avatar in thread view (header + incoming bubbles)

Goal
When a conversation is opened in /app/messages, show:

Header: other person’s avatar + name

Thread: show avatar next to incoming messages (sender_id != currentUserId) for WhatsApp-like feel.

Scope (UI only — NO DB changes)
Update only:

src/app/app/messages/page.tsx

Constraints / Safety

Must reuse conversation list data already fetched (from get_my_conversations()), including:

other_user_name

other_user_avatar_url (resolved in UI) OR avatar_path (resolved via helper)

Do NOT add new DB/RPC/migrations

Do NOT break polling/unread/read-receipts logic

Keep layout stable (no overflow, no flicker)

Implementation notes

Header:

Use existing Avatar component

Show avatar + name above the message thread area

Message rows:

For incoming messages, show a small Avatar on the left

Outgoing messages: no avatar

Keep it simple: show avatar for every incoming message (no grouping required)

Done when

Open /app/messages?c=<id>:

Header shows avatar + name correctly

Incoming bubbles show avatar

Outgoing bubbles unchanged

No layout regressions

npm run build passes