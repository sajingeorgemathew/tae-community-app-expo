Ticket 16 — Unified PostCard (refactor, no DB changes)

Goal
Stop duplicating post UI logic across multiple pages by extracting a reusable PostCard component.

Scope
Create a reusable component and refactor existing pages to use it.

Files / Locations

Create: src/components/PostCard.tsx (preferred)
(If your repo uses a different convention, use src/app/_components/PostCard.tsx — but keep it consistent.)

Used in

/app/feed

/app/me

/app/profile/[id]

PostCard must render

Content text

Audience badge (all/students/alumni)

Author name

created_at (formatted)

Attachments rendering:

image → <img>

video → <video controls>

link → <a target="_blank">

Optional actions:

Delete button ONLY if caller indicates allowed (author/admin)

Important rule

PostCard is UI-only.
Fetching posts/attachments + signed URLs stays in the page for now (no data layer refactor in this ticket).

Done when

All 3 pages render posts via PostCard

No UI regression (same output as before)

npm run build passes