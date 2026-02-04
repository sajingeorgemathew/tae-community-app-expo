Ticket 25 — Create Conversation (1:1) + RPC (no RLS loosening)
Goal

Allow a user to start a private 1:1 conversation with another member without requiring the other user to manually insert a membership row. Must remain fully private by conversation membership.

Background / Problem

Current RLS on conversation_members allows a user to insert only their own membership row (user_id = auth.uid()), so the client cannot add the second participant. We will solve this with a SECURITY DEFINER RPC that creates the conversation and inserts both members server-side.

Scope

DB

Create an RPC:

public.create_conversation_1to1(other_user_id uuid) returns uuid

Requirements:

Must require auth (auth.uid() not null)

Must prevent self-chat (other_user_id != auth.uid())

Must validate the other user exists in public.profiles

Must either:

Reuse existing 1:1 conversation if it already exists between the same two users (recommended), OR

Always create a new conversation (acceptable MVP, but duplicates possible)

Must insert two rows into public.conversation_members:

(conversation_id, auth.uid())

(conversation_id, other_user_id)

Do NOT loosen RLS on conversation_members.

App

Add route: /app/messages (placeholder list screen for now)

Add “Message” CTA on member profile page:

/app/profile/[id] shows a button: Message

Clicking should:

Call supabase.rpc("create_conversation_1to1", { other_user_id: profileId })

Navigate to /app/messages?c=<conversation_id> (MVP navigation)

Add also “Message” CTA in Directory (optional but nice):

/app/directory list item → Message link/button

Access:

Any authenticated user can start a conversation with any other member

UI should not show Message to yourself

Files expected to change

supabase/migrations/<date>_ticket25_create_conversation_rpc.sql (new)

src/app/app/messages/page.tsx (new)

src/app/app/profile/[id]/page.tsx (add Message button)

(optional) src/app/app/directory/page.tsx (add Message button)

Done when

A user can click “Message” on another profile

Conversation gets created (or reused) and both members are inserted

No RLS changes were made to allow inserting other users’ membership

Build passes: npm run build

Manual Tests

Login as User A

Go to User B profile

Click “Message”

Verify:

RPC returns a conversation_id

Both rows exist in conversation_members for A and B

Confirm privacy:

User C (not a member) cannot see that conversation or its messages

Build passes