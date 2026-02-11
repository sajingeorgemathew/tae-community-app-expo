Ticket 39 — Skills UI (display chips + lightweight search boost)

Goal
Skills look like a real platform and are visible in the right places.

Scope

Profile page (/app/profile/[id])

Display skills as small chips/badges under the profile header info.

If empty, show nothing (no empty-state banner).

Directory quick search console (Home quick search dropdown from Ticket 33)

Optionally show 1–2 skill chips in each result row (compact).

If skills empty, don’t show chips.

Constraints / Safety

No DB changes

No new backend logic

Reuse existing profile data already fetched (skills already stored in profiles.skills).

No layout breaking: chips must wrap and not overflow.

Done when

Skills are visible and consistent in profile page + quick search preview

No console errors

npm run build passes