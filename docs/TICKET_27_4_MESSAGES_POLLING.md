Ticket 27.4 — Live updates (polling) for messaging (MVP)

Goal
Make /app/messages feel “WhatsApp-like” without Supabase realtime:

Conversation list updates (unread dot + preview + ordering) when new messages arrive

Open thread updates when new messages arrive

Avoid flicker, avoid request storms

Scope (client-only polling)

Conversation list polling

Poll RPC get_my_conversations() every 6 seconds while on /app/messages

When user is currently viewing a conversation, do NOT repeatedly “mark as read” in a loop

If new incoming message arrives in a conversation that is NOT currently open, it should show unread dot + move up

Selected conversation polling (thread)

Poll messages for selected conversation every 3 seconds only when a conversation is selected

Use lightweight query: fetch latest message timestamp/id and compare before doing full refresh

Minimal approach: just re-fetch messages list, but keep it stable and prevent loops

Pause polling when tab is hidden

If document.visibilityState === "hidden": stop polling

Resume when visible

Don’t break existing behavior

Keep unread mark-as-read guard (Ticket 27.3 fix) intact

Keep attachment signed URLs logic intact

Keep build passing

Implementation guidelines

Use setInterval inside useEffect with proper cleanup

Use refs to store lastSeen timestamps/ids to avoid unnecessary re-renders

No DB changes required for polling (pure UI)

Done when

Open /app/messages in two browsers (User A & User B)

User B sends message → User A sees:

conversation moves to top within 6 seconds

unread dot appears if not opened

if conversation is open, thread updates within 3 seconds

No flicker / no infinite request spam in Network tab

npm run build passes