Ticket 34 — Global theme + demo-ready styling (scoped, no functional impact)

Goal
Navy/white theme, consistent spacing, rounded panels, clean typography — without breaking existing UI logic.

Scope

Add/extend global CSS (likely src/app/globals.css).

Ensure styling applies primarily to authenticated app UI by scoping under .app-shell.

Minimal markup change allowed: wrap /app layout content in a .app-shell container.

CSS requirements

CSS variables:

--brand-navy, --brand-white, --brand-muted, --card-bg, --border, --shadow, --radius

Base rules:

font smoothing

subtle background gradient (only inside app)

card/panel styling utilities

safe “button-like” utility classes (do NOT override all buttons globally)

Safety constraints

Do NOT change component logic.

Avoid global resets that could break existing Tailwind-based spacing.

No new dependencies.

Done when

App pages look cohesive (navy/white)

Feed/admin/messages still render correctly

No overflow regressions

npm run build passes