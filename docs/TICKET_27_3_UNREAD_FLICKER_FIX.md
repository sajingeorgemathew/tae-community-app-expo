Ticket 27.3 Hotfix — Stop unread flicker / request spam

Problem

/app/messages is flickering and network shows repeated requests:

conversation_reads?on_conflict...

messages?select=...

This indicates an infinite loop caused by mark-as-read triggering state updates that re-trigger effects.

Goal

Stop request spam and UI flicker.

Keep unread dot + bold working.

Mark-as-read should happen once per conversation open (not repeatedly).

Rules

Do NOT remove unread feature.

Do NOT add new DB changes.

Minimal safe changes.

Expected fix pattern

Move mark-as-read to explicit user action (conversation click) OR gate it with a ref so it runs once per conversation selection.

Ensure useEffect dependency arrays do NOT include state that is updated by mark-as-read.

Prevent Strict Mode double-run from causing repeated upserts.

Done when

Network panel no longer shows repeated conversation_reads/messages calls.

Selecting a conversation triggers at most:

one fetch for messages

one upsert to conversation_reads (only if unread)

UI no longer flickers.