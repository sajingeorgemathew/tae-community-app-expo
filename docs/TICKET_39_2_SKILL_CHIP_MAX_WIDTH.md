Ticket 39.2 — Skill chip max-width hardening (Quick Search)

Goal
Prevent long skill names from breaking the Home quick search dropdown layout.

Scope
- Update only: src/app/app/page.tsx
- No DB changes
- No logic/query changes

Requirements
- Skill chip must be single-line and truncated with ellipsis
- Enforce hard max width (140px)
- Add title attribute so full skill shows on hover
- Must not affect +N indicator behavior

Done when
- Long skills truncate and do not expand the row
- +N remains visible
- npm run build passes
