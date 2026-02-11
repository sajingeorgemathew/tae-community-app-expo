Ticket 39.1 — Quick Search skill chips hardening (compact + safe)

Goal
Prevent long/abusive skill text from breaking the Home quick-search dropdown layout.
Keep skills as a compact "preview" only.

Scope (UI-only, no DB changes)
Update ONLY:
- src/app/app/page.tsx

Rules for skills display in quick-search dropdown
1) Show at most 1 skill chip in dropdown (preferred).
2) Chip must be single-line and truncated:
   - whitespace-nowrap
   - overflow-hidden
   - text-ellipsis / truncate
   - hard max width (e.g., 120–160px)
3) If user has more skills beyond the first chip, show a "+N" indicator:
   Example: [Power BI] +3
4) If no skills, show nothing (no placeholder).
5) Add title attribute to chip (title=full skill) for hover tooltip.
6) Must not increase dropdown row height beyond current compact design.

Done when
- Searching a user with long skills does not expand rows or overflow
- Dropdown stays tidy and consistent
- Build passes: npm run build
