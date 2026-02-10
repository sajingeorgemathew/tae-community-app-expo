Ticket 38.1 — Messages: show avatar in conversation list preview

Goal
In /app/messages, each conversation row shows the other user’s avatar (image if available), consistent with Directory.

Current
Conversation list is driven by RPC public.get_my_conversations() which returns conversation_id, other_user_id, other_user_name, last_message_content, last_message_at, unread fields.

Change (Preferred)
Update RPC to include other_user_avatar_path from public.profiles.avatar_path.

Scope

DB: new migration to update RPC signature + select

UI: src/app/app/messages/page.tsx to render Avatar image in conversation list

Constraints

Preserve existing unread logic, polling logic, mark-as-read guard logic

Use existing src/components/Avatar.tsx and src/lib/avatarUrl.ts

Use signed URLs (do NOT make bucket public)

Avoid extra network spam (cache per-page as currently implemented)

Done when

Conversation list shows avatar image for users who have one

Fallback initials still works

npm run build passes