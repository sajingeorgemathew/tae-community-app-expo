# Ticket 50(A) — Direct New Post link from Welcome

## Goal
On the Welcome/Dashboard page (/app), the "New Post" button should navigate directly to:
- /app/feed/new

Instead of going to:
- /app/feed?new=1
and requiring a second click.

## Scope
- Only update the New Post CTA on /app (welcome page).
- No DB changes.
- No changes to feed behavior or other navigation paths.

## Acceptance Criteria
- Clicking "New Post" on /app lands directly on /app/feed/new.
- No other nav links are affected.

## Implementation
- Changed `href` in `src/app/app/page.tsx` line 239 from `/app/feed?new=1` to `/app/feed/new`.
- No other files changed.
