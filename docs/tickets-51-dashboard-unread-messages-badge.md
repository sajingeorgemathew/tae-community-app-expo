# Ticket 51(C) — Dashboard Unread Messages Badge

## Goal
On the Welcome/Dashboard page (/app), show an unread messages badge on the Messages button.

## Data source
Reuse existing RPC `get_my_conversations()` which already returns per-conversation unread count.

## Logic
- Fetch conversations via `supabase.rpc('get_my_conversations')`
- Sum `unread_count` across rows
- Display badge only if total > 0
- Cap display for large counts (e.g., 99+)

## Scope
- UI only.
- No DB migrations.
- No changes to messaging system.

## Acceptance Criteria
- Logged-in user sees a badge on Messages button when unread messages exist.
- Badge updates on reload; optional: refresh on interval (like 15–30s) if desired.
- No badge shown when total is 0.

## Testing
- Send a message from User A to User B.
- Verify User B dashboard shows unread badge > 0.
- Open /app/messages and read messages; return to /app and badge drops to 0 (after reload or refresh).

## Implementation Notes
- Added `unreadCount` state to `src/app/app/page.tsx`.
- Calls `supabase.rpc('get_my_conversations')` after posts load; sums `unread_count` field.
- Badge rendered as red pill (`bg-red-500 rounded-full`) on the Messages nav link; shows "99+" if > 99.
- Errors are caught silently (logged in dev only) — dashboard never breaks if RPC fails.
- No polling added (MVP); badge refreshes on page load/navigation.
