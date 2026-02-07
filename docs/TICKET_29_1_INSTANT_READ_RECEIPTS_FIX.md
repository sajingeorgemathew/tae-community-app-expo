Ticket 29.1 — Instant read while open + sender blue ✓✓

Goal

If receiver is inside the open conversation, unread dot clears immediately.

Sender sees blue ✓✓ as soon as receiver reads (poll-based).

Scope

Messages page: fix local state so unread dot clears instantly when conversation is open and new incoming message arrives.

Add read-receipt state for open conversation:

Fetch other member’s last_read_at (conversation_reads)

Render ✓✓ blue for messages created_at <= other_last_read_at (only for my messages)

DB

Prefer small RPC:

get_conversation_read_state(conv_id uuid) returns other_last_read_at timestamptz

SECURITY DEFINER

Uses auth.uid() and membership join

No schema changes.

Done when

Receiver: while thread open, when new message arrives → unread dot disappears without switching conversations.

Sender: blue ✓✓ appears within polling interval while receiver stays inside the thread.

No request loops / flicker.

npm run build passes.

