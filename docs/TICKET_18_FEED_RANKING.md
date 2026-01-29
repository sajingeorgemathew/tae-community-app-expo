Ticket 18 — Feed ranking (Daily shuffle + Fresh pinned + 5-day window)

Goal
Make feed feel alive without changing DB:

New posts show at top immediately

Older posts shuffle daily

Posts older than 5 days disappear from feed ONLY (still visible in profiles)

Scope (NO DB changes)
Modify only feed behavior:

Update /app/feed data logic

Do not change profiles pages logic

Rules

Feed window (“disappearing”):

Only show posts where created_at >= now - 5 days

This affects /app/feed ONLY

Ranking logic:

Define “Fresh” as posts in last 24 hours

Fresh posts appear at the top, sorted newest-first

Remaining posts in the 1–5 day range are “Recent”

Recent posts are shuffled daily, but stable during the same day

Daily shuffle seed

Use deterministic seed: ${YYYY-MM-DD}:${userId}

Shuffle should be stable for a user per day

Next day → different order

Constraints

Keep existing RLS + delete logic

Keep existing attachment + signed URL logic

Keep filters (All / Students / Alumni) working

Ensure build passes

Done when

Feed shows newest posts immediately at top

Older (1–5 day) posts shuffle daily

Posts older than 5 days do not show in feed

Refresh does not change order within same day (for same user)

/app/me and /app/profile/[id] still show posts normally (not filtered to 5 days)

npm run build passes

Local test checklist

Create 2–3 new posts → appear at top in correct order

Confirm refresh doesn’t re-shuffle within the same day

Confirm filter toggle still works

(Manual test) Temporarily set one post’s created_at older than 5 days in Supabase → it disappears from feed, still appears on profile pages