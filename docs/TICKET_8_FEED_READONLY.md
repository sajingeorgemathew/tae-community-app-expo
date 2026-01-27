Ticket 8 — Feed page (read-only)
Route: /app/feed
Goal: Logged-in users can read a feed of posts.

Requirements

List newest posts (limit ~30), ordered by created_at desc

Each post shows:

author name (from profiles.full_name)

created date/time (simple readable format)

content

audience badge (optional)

Optional UI-only filter toggle: All / Students / Alumni

If implemented, it’s just a client filter on already-fetched posts (no schema/RLS changes)

Constraints

Read-only only (no create post yet)

No DB changes

Keep changes minimal

Build must pass

Done

/app/feed renders for logged-in users

Students/alumni visibility is enforced by RLS (no extra hacks)

npm run build passes

Provide local test steps