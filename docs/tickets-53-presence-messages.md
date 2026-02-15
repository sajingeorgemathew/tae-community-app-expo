# Ticket 53 — Presence dot in Messages (+ optional Q&A)

## Goal
Reuse presence table + heartbeat to show online (recently active) green dot in Messages UI.
Optional: add dots in Q&A pages if minimal.

## Scope
### Required
- Messages (/app/messages):
  - Show green dot on conversation partner avatar in conversation list.
  - Show green dot on partner avatar in thread header.
  - Online definition: last_seen_at within 3 minutes.

### Optional (implemented)
- Q&A list (/app/questions):
  - Show dot next to question author avatars.
- Q&A detail (/app/questions/[id]):
  - Show dot next to question author and answer author avatars.

## No DB changes
- Use existing public.presence table (Ticket 52)
- Use existing heartbeat (PresenceProvider/usePresenceHeartbeat)

## Implementation

### Files changed
- `src/app/app/messages/page.tsx` — presence fetch + green dot on conversation list avatar and thread header avatar
- `src/app/app/questions/page.tsx` — presence fetch + green dot on question author avatar in list
- `src/app/app/questions/[id]/page.tsx` — presence fetch + green dot on question author and answer author avatars

### Pattern (same as Directory/Faculty from Ticket 52)
1. Fetch presence rows for relevant user IDs: `supabase.from("presence").select("user_id, last_seen_at").in("user_id", ids)`
2. Build `onlineSet: Set<string>` — online if `Date.now() - last_seen_at <= 3 minutes`
3. Wrap `<Avatar>` in `<div className="relative">` and conditionally render green dot span
4. Green dot classes: `absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full`

### Messages-specific details
- Presence re-fetches on every conversation poll cycle (conversations useEffect dependency)
- Graceful degradation: if presence fetch fails, no dots shown (no crash)

## Testing
### Messages
1. Open two browsers with two accounts (User A and User B)
2. User A active => green dot appears on User A's avatar in User B's conversation list
3. User A active => green dot appears in thread header when User B opens conversation with User A
4. Close User A's tab => dot disappears after ~3 minutes
5. Verify no crash if presence table is empty or query fails

### Q&A
1. User A active => green dot on User A's question in /app/questions list
2. User A active => green dot on User A's avatar in /app/questions/[id] (as question author or answer author)
3. Close User A's tab => dot disappears after ~3 minutes
