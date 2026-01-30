Ticket 21 — Admin moderation dashboard (MVP)
Goal

Academy admins can clean up posts/users without dev help.

Route

/app/admin (protected by existing middleware + UI admin check)

Admin check

Must verify admin by profiles.role === 'admin'

Hide UI for non-admin (show “Not authorized”)

DB policies still enforce delete permissions

Features (MVP)
A) Posts moderation

Show recent posts list (newest first)

Include:

author name (clickable link)

created_at

audience badge

content preview

attachments preview (reuse PostCard)

Delete any post (uses existing delete logic including attachment cleanup)

B) Filters

Optional filter by audience: all / students / alumni

Time filter:

“Last 1 hour”

“Last 2 hours”

“Last 3 hours”

Default: last 24 hours

Filtering can be done client-side after fetching (simple), OR server query using created_at >= now()-interval.

C) Remove user (admin only)

Show a small “Users” section:

list recent users (limit 30) OR search by name/email (optional)

“Remove user” action:

MVP option: delete the user’s profile row only (and/or set role/status)

NOTE: deleting auth users requires Service Role + server-side admin endpoint. Do NOT do that in browser.

For now implement safe MVP:

Add profiles.is_disabled boolean default false OR use an existing column if present.

Admin can set is_disabled = true (soft disable).

Middleware should block disabled users from /app/* and redirect to /login (or show message).

UI should hide admin page from disabled users too.

Done when

Admin can open /app/admin

Admin sees posts and can delete any post

Admin can filter by audience and time window

Admin can disable a user via UI (soft disable)

Non-admin cannot access (UI blocked; middleware still protects /app)