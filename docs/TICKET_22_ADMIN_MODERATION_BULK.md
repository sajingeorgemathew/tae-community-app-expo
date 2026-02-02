Ticket 22 — Admin moderation upgrades (bulk actions + directory + nav link)

Goal

Make /app/admin a real moderation console so the academy can stop spam fast, without dev help.

Scope A — Admin link on /app (admin-only UI)

Update src/app/app/page.tsx:

Add a button/link to /app/admin labeled Admin Dashboard

Show it ONLY when the logged-in user is an admin (profiles.role === 'admin')

Do NOT change existing auth/session/logout logic

Scope B — Admin dashboard improvements

Route: /app/admin (existing)

1) Admin Directory panel (inside /app/admin)

Add a “Users” panel that:

Lists profiles (limit ~50)

Search filter (client-side is fine): name/program/grad_year/role

Show columns: full_name, role, is_disabled

Actions:

Disable / Enable user (toggles profiles.is_disabled)

Optional: Link to view member profile /app/profile/[id]

Notes:

UI hidden for non-admin (page already checks role; keep that)

DB policy already allows admin update on profiles.is_disabled

2) Bulk delete posts (spam cleanup)

Add a “Posts” panel that:

Lists recent posts (already exists)

Time window filter buttons:

Last 1 hour / 2 hours / 3 hours / 24 hours

Optional audience quick filter: all / students / alumni

Add selection checkboxes on each post row/card:

Select individual posts

Select all visible posts

Add bulk actions:

Delete Selected Posts (confirm before delete)

Delete Posts From Selected Users (within chosen time window)

Implementation notes:

Keep DB RLS unchanged; UI is convenience only.

Admin delete works due to existing policies.

When deleting posts, reuse the same delete flow used in feed (delete storage objects first, then delete post).

UI updates immediately after bulk delete (remove from list without refresh).

3) Bulk disable users (optional but recommended)

Add action:

Disable Selected Users (selected via Users list checkboxes)

This is separate from posts selection, but can be simple:

checkbox per user in Users list

bulk disable button

Done when

Admin sees an Admin Dashboard button on /app

/app/admin includes Users panel with search + toggle disable

Admin can:

delete any single post

select multiple posts and bulk delete

select users and delete their posts within last 1/2/3 hours

(optional) bulk disable users

Non-admin sees “Not authorized” for /app/admin

npm run build passes