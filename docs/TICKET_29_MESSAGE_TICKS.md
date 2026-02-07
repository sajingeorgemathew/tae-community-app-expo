Ticket 29 — WhatsApp-style message ticks (sent/delivered/read)

Goal: Show ✓ / ✓✓ / ✓✓(blue) for messages I sent, based on recipient delivery + read state.

Definitions (MVP)

Sent (✓): message row exists (default state)

Delivered (✓✓ gray): recipient has fetched the conversation thread after the message was created

Read (✓✓ blue): recipient has opened the conversation and marked read after the message was created

DB changes (Supabase)

New table: conversation_deliveries

conversation_id uuid fk -> conversations(id) on delete cascade

user_id uuid fk -> profiles(id) on delete cascade

last_delivered_at timestamptz not null default now()

primary key (conversation_id, user_id)

RLS (strict)

SELECT: authenticated can read only their own delivery rows (user_id = auth.uid())

INSERT/UPSERT: authenticated can insert/update only their own row (user_id = auth.uid())

No delete needed (optional)

App changes (Next.js)
File: src/app/app/messages/page.tsx

A) When a conversation is open (conversationId is set) and currentUserId exists:

Upsert conversation_deliveries for (conversationId, currentUserId) with last_delivered_at = now()

Guard to avoid spam:

only upsert at most once every 10 seconds per conversation OR

only upsert when newest message id changes

B) Fetch recipient tick state for open conversation

We need "other user's" last_read_at from conversation_reads

And "other user's" last_delivered_at from conversation_deliveries
Approach:

Query conversation_members to find other_user_id for conversationId

Then query:

conversation_reads where conversation_id=conversationId and user_id=other_user_id

conversation_deliveries where conversation_id=conversationId and user_id=other_user_id

C) Render ticks for messages I sent
For each message where message.sender_id === currentUserId:

if other_last_read_at exists AND message.created_at <= other_last_read_at => READ (blue ✓✓)

else if other_last_delivered_at exists AND message.created_at <= other_last_delivered_at => DELIVERED (gray ✓✓)

else => SENT (gray ✓)

UI requirements

Place ticks bottom-right of my message bubble, small size

Do NOT show ticks on messages sent by other user

Keep existing unread dot/bold logic intact (do not change)

Done when

If User B opens /app/messages and opens the conversation, User A sees ✓✓ blue on older messages

If User B has not opened conversation but has loaded thread via messages polling, User A sees ✓✓ gray

If User B never loaded thread, User A sees ✓

No flicker loops / request spam in Network tab

npm run build passes
