# Ticket 24 — Messaging DB foundation (schema + RLS)

Goal:
Create safe, private 1:1 message storage with strict RLS and private attachments.

Scope
- Create tables:
  - public.conversations
  - public.conversation_members
  - public.messages
  - public.message_attachments
- Enforce:
  - Only conversation participants can read/write
  - Only sender can delete own message (admin cannot read messages)
- Storage:
  - Create bucket: message-media (private)
  - Storage policies must restrict access by conversation membership

Database requirements
1) conversations
- id uuid pk default gen_random_uuid()
- created_at timestamptz default now()

2) conversation_members
- conversation_id uuid fk -> conversations(id) on delete cascade
- user_id uuid fk -> profiles(id) on delete cascade
- joined_at timestamptz default now()
- unique(conversation_id, user_id)
- index(user_id), index(conversation_id)

3) messages
- id uuid pk default gen_random_uuid()
- conversation_id uuid fk -> conversations(id) on delete cascade
- sender_id uuid fk -> profiles(id) on delete restrict (or cascade ok)
- content text nullable (allow attachments-only later)
- created_at timestamptz default now()
- index(conversation_id, created_at)

4) message_attachments
- id uuid pk default gen_random_uuid()
- message_id uuid fk -> messages(id) on delete cascade
- type text check in ('image','video')
- storage_path text not null (matches storage.objects.name)
- mime_type text
- size_bytes bigint
- created_at timestamptz default now()
- unique(storage_path)
- index(message_id)

RLS rules
Enable RLS on all 4 tables.

conversation_members
- SELECT: authenticated can read only rows where user_id = auth.uid()
- INSERT: authenticated can insert only their own membership row (user_id = auth.uid())
- DELETE: authenticated can delete only their own membership row (optional for now)

conversations
- SELECT: authenticated can read conversations where they are a member (exists in conversation_members)
- INSERT: authenticated can create conversations (allow any authenticated)
- UPDATE/DELETE: not needed for MVP (deny or omit policies)

messages
- SELECT: authenticated can read messages only if they are a member of that conversation
- INSERT: authenticated can insert only if sender_id = auth.uid() AND they are a member of the conversation
- UPDATE: optional (deny for MVP)
- DELETE: sender can delete own messages only (sender_id = auth.uid())

message_attachments
- SELECT: authenticated can read only if they are a member of the attachment's conversation
- INSERT: authenticated can insert only if they are the sender of the parent message AND member of conversation
- DELETE: sender can delete own attachment rows only (based on parent message sender)

Storage bucket and policies
Create bucket `message-media` as PRIVATE.

Storage policies on storage.objects for bucket_id='message-media':
- SELECT: allow if auth.uid() is a member of the conversation associated to the storage object:
  storage.objects.name = message_attachments.storage_path
  join message_attachments -> messages -> conversation_members(user_id = auth.uid())

- INSERT: allow upload only if uploader is a member of the conversation.
  For MVP, we accept that upload may happen before attachment row exists, so we use path convention:
  messages/{conversation_id}/{message_id}/{uuid}.{ext}
  Policy checks conversation_id parsed from name OR require attachment row first.
  Choose the safer approach:
    Approach A (safer, recommended): require attachment row exists first (client inserts attachment row then uploads with upsert=false)
    Approach B (simpler UX): allow upload based on folder prefix messages/<conversation_id>/ and membership in that conversation.

For this ticket, implement Approach B with a strict prefix rule and membership check:
- name LIKE 'messages/%'
- extract conversation_id from name segment 2
- validate membership exists for that conversation_id

- DELETE: allow only if user is member of conversation AND is sender of the message OR (optional) allow member delete for own uploads
For MVP: allow only if sender of the message.

Done when
- Users cannot read other users' conversations/messages in SQL tests
- Storage SELECT is blocked unless member
- Storage INSERT/DELETE are blocked unless allowed
- Migration file created under supabase/migrations/
