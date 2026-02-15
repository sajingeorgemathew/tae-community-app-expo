# Ticket 52 — Online Presence (Recently Active)

## Goal
Show a green dot beside users who are "recently active" (last seen within 3 minutes).

## DB
Create table public.presence:
- user_id uuid PK references profiles(id) on delete cascade
- last_seen_at timestamptz not null default now()
- updated_at timestamptz not null default now()

RLS:
- SELECT: authenticated can read all rows
- INSERT: authenticated, only for self (user_id = auth.uid())
- UPDATE: authenticated, only for self
- DELETE: admin only (optional)

## Client heartbeat
When user is authenticated:
- upsert own presence row every 45–60 seconds
- update on visibilitychange / focus

## UI
Show presence dot in user lists:
- Directory: show dot if now - last_seen_at <= 3 minutes
(Optional) Faculty and Messages list also show dot.

## Non-goals
- Real-time websocket presence
- "Typing" indicators
- Perfect online accuracy

## Implementation

### Files changed
- `supabase/migrations/20250216_ticket52_online_presence.sql` — presence table, RLS, trigger
- `src/lib/usePresenceHeartbeat.ts` — heartbeat hook (upsert every 45 s + visibility/focus)
- `src/components/PresenceProvider.tsx` — client wrapper to call hook from server layout
- `src/app/app/layout.tsx` — mounts PresenceProvider in app shell
- `src/app/app/directory/page.tsx` — fetches presence, shows green dot
- `src/app/app/faculty/page.tsx` — fetches presence, shows green dot

### Steps
1. Run migration: `supabase db push` or `supabase migration up`
2. Heartbeat auto-starts for any authenticated user inside /app routes
3. Directory and Faculty pages query presence and show dot for users seen within 3 minutes

## Testing
- Open app in two browsers with two accounts
- One account active => dot visible on Directory and Faculty
- Close tab => dot disappears after 3 minutes
- Verify heartbeat fires on tab focus/visibility change (check Network tab for presence upserts)
- Verify RLS: user can only upsert own row, cannot delete others' rows
