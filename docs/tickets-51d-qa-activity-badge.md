# Ticket 51(D) — Q&A Activity Badge (Dashboard)

## Goal
Show a badge on the Questions button on /app (welcome page) indicating new Q&A activity since the user last visited /app/questions.

Badge number = (new questions) + (new answers) since last_seen_questions_at.

## DB change
Create table: public.qa_activity_reads
- user_id uuid PK references profiles(id) on delete cascade
- last_seen_at timestamptz not null default now()
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

RLS:
- SELECT: user can read own row only
- INSERT: user can insert own row only (user_id = auth.uid())
- UPDATE: user can update own row only
- DELETE: admin only (optional)

## App behavior
- On /app/questions page load, upsert last_seen_at = now() for current user.
- On /app dashboard, fetch last_seen_at (or use profile.created_at fallback).
- Compute counts:
  - count(*) from questions where created_at > last_seen_at
  - count(*) from answers where created_at > last_seen_at
- Badge shown if total > 0 (cap at 99+)

## Non-goals
- Not per-question unread tracking
- No notifications
- No faculty embedding

## Implementation

### Files changed
- `supabase/migrations/20250215_ticket51d_qa_activity_reads.sql` — new table, RLS, trigger
- `src/app/app/questions/page.tsx` — upsert `last_seen_at` on page load
- `src/app/app/page.tsx` — fetch Q&A activity count, show badge on Questions link

### Steps
1. Created `qa_activity_reads` table with `user_id` PK, `last_seen_at`, `created_at`, `updated_at`.
2. Reused existing `public.set_updated_at()` trigger function from ticket 47.
3. Added RLS policies: SELECT/INSERT/UPDATE own row, DELETE admin only.
4. On `/app/questions` mount, upsert `qa_activity_reads` with current timestamp (fire-and-forget, errors logged).
5. On `/app` dashboard, fetch `last_seen_at` from `qa_activity_reads`; fallback to `profile.created_at` or `now()`.
6. Count questions and answers with `created_at > last_seen_at` using `head: true` + `count: "exact"`.
7. Display badge on Questions nav link (same style as Messages badge), capped at 99+.

## Testing
- After visiting /app/questions, badge should be 0.
- When another user posts a new question, badge increments.
- When tutor/admin posts answers, badge increments.
- Visiting /app/questions resets the badge.

### Manual test steps
1. Run migration: `supabase db reset` or apply `20250215_ticket51d_qa_activity_reads.sql`.
2. Log in as User A, visit `/app` — Questions badge should show 0 (or not appear) if no new activity.
3. Log in as User B (or tutor), post a new question or answer.
4. Return to User A's `/app` — badge should show count of new items.
5. Click "Questions" to visit `/app/questions` — `last_seen_at` upserted.
6. Return to `/app` — badge should disappear (count = 0).
7. Verify RLS: User A cannot read User B's `qa_activity_reads` row.
