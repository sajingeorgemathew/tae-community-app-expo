Ticket 28.1 — Chat thread day separators (WhatsApp-style)

Goal: Inside an open conversation thread (/app/messages?c=...), show day separators like WhatsApp: Today / Yesterday / Date.

Scope

Update: src/app/app/messages/page.tsx

No DB changes

Requirements

In the message thread (right pane), insert a centered separator whenever the local calendar day changes.

Separator label rules:

If message date is today (local) → "Today"

If message date is yesterday (local) → "Yesterday"

Else → formatted date like "Jan 31, 2026"

Messages remain ordered by created_at asc.

Keep existing bubble rendering/alignment unchanged.

Keep existing polling + unread logic intact.

Keep existing “time in conversation list” formatting untouched (this is only for inside-thread separators).

Implementation approach (simple)

Add helper functions in messages/page.tsx:

getLocalDateKey(ts): string // e.g. "2026-02-06"

formatDayLabel(ts): string // Today/Yesterday/Date

During render of message list:

Track lastDateKey; when dateKey changes, render separator element.

UI details (minimal)

Separator should be centered with subtle style:

small text, muted gray

light border or pill background

consistent spacing above/below

Done when

In a conversation with messages across multiple days, separators appear correctly.

No flicker loops.

npm run build passes.