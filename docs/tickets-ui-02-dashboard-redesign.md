# UI Ticket 02 — Dashboard Redesign (Welcome Page)

## Design reference
Use docs/welcome.png (Google Stitch) as visual inspiration:
- Navy gradient hero banner
- Two primary actions (Create Post, Ask Question)
- 4 stat cards
- Two-column preview: Recent Posts + Recent Questions

## Scope
- Only redesign /app dashboard UI (src/app/app/page.tsx) and any new small reusable UI components.
- NO route changes.
- NO DB changes.
- NO changes to Supabase RLS/policies.
- Keep existing data logic, just present it in a new layout.

## Required sections (match screenshot style)
1) Hero banner (navy gradient)
   - "Welcome back, {name}"
   - small subtitle using existing profile info (role/program/grad_year)
   - buttons:
     - Create Post -> /app/feed/new
     - Ask Question -> /app/questions

2) Stat cards row (4 cards)
   - Unread Messages (use existing count logic / RPC)
   - New Q&A Activity (use existing Q&A activity badge logic)
   - Online Members (use presence table count within 3 minutes)
   - Browse Directory (link to /app/directory) OR Total members count if already available

3) Two-column previews
   - Recent Posts: show latest 3 items (title/preview, author, time)
   - Recent Questions: show latest 3 items (title/preview, answer count indicator if available)

## Non-goals
- Do NOT add tags/topics/solved states.
- Do NOT add charts/analytics/events/alerts.
- Do NOT invent new data.

## Acceptance Criteria
- /app visually resembles the reference (spacing, cards, hero)
- All existing actions still work
- No console errors
- Works on desktop; mobile can stack sections vertically
