Ticket 33 — Home “Directory quick search console” (preview as you type)

Goal
On /app, add a Facebook-like member search box that previews results as the user types.

Scope (UI-only)
Update:

src/app/app/page.tsx (Home)

Optional small enhancement:

src/app/app/directory/page.tsx read ?query= and pre-fill existing search/filter if available (safe optional).

Behavior

Search input near top of main content, slightly left-centered.

On typing:

Debounced query (300–400ms)

Query profiles table by full_name and optionally program (ILIKE)

Limit results to 6

Result row shows:

full_name

role badge (member/alumni/admin)

program (if present)

Clicking a result opens: /app/profile/[id]

A “See all results” link goes to: /app/directory?query=<text>

UX rules

If query empty: show nothing (no dropdown).

If query non-empty and no results: show “No matching members.”

Dropdown should not overflow; keep it within card area.

Done when

Typing shows preview results after debounce

Clicking result navigates correctly

“See all results” navigates to directory with query param

npm run build passes