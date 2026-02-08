Ticket 32 — Home Dashboard Layout (Left rail + Feed preview + Quick actions)

Goal
Make /app feel like a real home dashboard (demo-ready) without breaking existing app behavior.

Scope (UI-only)
Update only:

src/app/app/page.tsx (or your actual /app home route file)
Optionally add small UI components in src/components/ if needed, but keep it minimal.

Layout requirements

Two-column layout:

Left rail (fixed width):

Logout

My Profile (link to /app/me)

Messages (link to /app/messages)

New Post (link to /app/feed?new=1) (safe deep-link)

Directory (link to /app/directory)

Main panel:

Title: “Welcome” / “Home”

Feed preview (latest 5–8 posts, read-only preview)

“Go to Feed” button linking to /app/feed

Feed preview rules (important)

Read-only. Do NOT add delete/reactions/comments here.

Show:

author name

created_at (simple)

content preview (truncate)

if media exists, show a small “📎 Media” indicator (no need to render images/videos here)

Keep query small: limit 5–8 items.

Done when

/app renders left rail + preview list reliably

No changes needed in Supabase policies

npm run build passes