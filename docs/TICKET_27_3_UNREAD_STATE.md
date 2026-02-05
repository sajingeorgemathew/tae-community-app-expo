Ticket 27.3 — Unread state (dot + bold)

Goal
Add “WhatsApp-style” unread indicator to conversation list:

unread conversation → bold name/preview + small dot

read conversation → normal style

Scope
DB changes (Supabase):

Add table: conversation_reads

conversation_id uuid fk -> conversations(id) on delete cascade

user_id uuid fk -> profiles(id) on delete cascade

last_read_at timestamptz not null default now()

PK or unique: (conversation_id, user_id) (one row per user per convo)

RLS:

SELECT: user can read only their own rows (user_id = auth.uid())

INSERT: user can insert only for themselves

UPDATE: user can update only for themselves

DELETE: optional (not needed for MVP)

RPC changes:
Update get_my_conversations() to also return:

unread_count int (messages from other user where created_at > my last_read_at)

is_unread boolean (unread_count > 0)

last_read_at timestamptz (optional)

App changes:
/app/messages

When opening a conversation (?c=...), mark as read:

Upsert conversation_reads for current user, set last_read_at = now()

After marking read, refresh conversation list so dot/bold disappears

Conversation list UI:

If is_unread true:

show a small dot (e.g. blue circle)

bold other_user_name and preview

If false: normal styling

Rules / logic

Unread means: messages in that conversation where:

sender_id != auth.uid()

created_at > last_read_at (or if no read row exists, treat last_read_at as epoch)

Do NOT count my own messages as unread.

Works for text and attachment-only messages (preview already handled in Ticket 27.2/27.3).

Done when

Send message from User A to User B → B sees conversation bold + dot

When B opens that conversation → dot disappears after mark-as-read

Refresh persists the state

npm run build passes