Ticket 35 — Login page branding (logo + cleaner layout)

Goal
Add Toronto Academy logo above login form and make login page feel “client-ready” without changing auth logic.

Scope (UI only, NO auth changes)
Update only login/signup UI layout + styling.

What changes

Add logo above login form (responsive, centered)

Use navy accents + white card layout (lightweight styling)

Keep existing fields/buttons exactly the same behavior

No new dependencies

Logo asset
Source: Implementation requirement: already stored locally in /public (recommended) to avoid Next.js remote image config issues.

Done when

Logo shows above form on /login (and /signup if you apply branding there too)

Page looks clean: centered card, subtle navy accent

No changes to Supabase auth behavior

npm run build passes