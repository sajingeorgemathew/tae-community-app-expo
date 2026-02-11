Ticket 40 — Profile completeness nudges (no nagging, client-wow)

Goal
Encourage users to complete profiles with a simple, friendly UI.

Scope (UI only)
1) /app/me
- Add a “Profile completeness” card
- Score is 0–100 based on 4 items (25% each):
  A) Avatar present (profiles.avatar_path not null)
  B) Headline present (trimmed length > 0)
  C) Skills present (skills array length > 0)
  D) Program + Graduation Year present (both non-empty)
- Show progress bar + percent
- Show checklist of missing items with “Add” buttons
- “Add” buttons should scroll to the relevant field and focus it:
  - Avatar -> focus file input / click it
  - Headline -> focus headline textarea/input
  - Skills -> focus skills input
  - Program/Year -> focus program or year input

2) Optional: /app (home)
- If completeness < 100, show a small prompt card/badge:
  “Finish your profile →”
- Clicking takes user to /app/me and optionally anchors to the card (hash ok)
- Must not affect directory/feed logic

Constraints
- No DB migrations
- No new dependencies
- Must not change existing edit/save behavior on /app/me
- Must update live after saving profile (use existing profile state)

Done when
- User sees % and checklist on /app/me
- Clicking “Add” scrolls + focuses correctly
- After saving profile fields, % updates immediately
- npm run build passes
