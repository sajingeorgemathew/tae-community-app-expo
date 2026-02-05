Ticket 28 — Message timestamps (WhatsApp-style)

Goal: Show friendly timestamps like WhatsApp:

Today → show time (e.g., “2:41 PM”)

Yesterday → show “Yesterday”

Older → show date (e.g., “Jan 31, 2026”)

In the thread view, show time next to each message (small)

Scope

Add a small helper function only (no DB changes).

Update ONLY the messaging UI page:

src/app/app/messages/page.tsx

Rules

Use user’s local time (browser).

Conversation list:

Show friendly label based on last_message_at.

Message bubbles:

Show time for each message (e.g., “2:41 PM”).

Do not change polling/unread logic except to add formatting.

Done when

Conversation list shows Today/Yesterday/Date correctly.

Message bubbles show time correctly.

Build passes.