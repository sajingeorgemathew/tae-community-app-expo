# ADMIN-01A — Admin dashboard audit + mobile blueprint

## Goal
Audit the admin functionality that exists in the monorepo web app and produce a clear mobile implementation blueprint for the admin area.

## Why
The admin dashboard is too broad to build safely in a single ticket. We first need to understand:
- what exists in the web app
- what belongs on the mobile admin landing page
- what is read-only summary vs actual action flow
- which pieces should be built first on mobile

## Scope
This ticket should:
1) inspect the web admin area inside this monorepo
2) inventory the admin pages, widgets, actions, and flows
3) identify dependencies and backend contracts for each area
4) propose a mobile-first admin information architecture
5) break the future admin work into concrete follow-up tickets

## Explicitly included
- web admin audit
- admin feature inventory
- admin mobile blueprint document
- recommended ticket breakdown/order

## Explicitly NOT included
- No actual mobile admin implementation yet
- No backend migrations/policies
- No apps/web behavior changes
- No UI redesign work
- No realtime implementation

## Important implementation note
Claude should inspect the actual web admin implementation in this monorepo and identify:

### Admin landing/dashboard
- what cards/sections/widgets are present
- what they show
- whether they are summaries, entry points, or actions

### Admin management surfaces
- member management
- role/status handling
- moderation tools
- posts/questions/answers moderation
- invite/admin operational tools
- metrics/activity blocks
- anything instructor-related affected by SYS-01 naming alignment

Claude should also determine:
- which admin features are already backed by mobile-usable backend contracts
- which features are too web-specific and should be deferred
- what the best order is for mobile admin delivery

## Existing context
Already working:
- mobile admin route shell exists or is planned
- feed moderation/owner actions exist in mobile
- question/answer owner-admin actions exist in mobile
- instructor terminology is now a UI concern
- web admin is available here only as reference, not the separate production client web repo

## Expected output
This ticket should produce a useful blueprint document that includes:

1) Admin feature inventory
2) Proposed mobile admin IA (information architecture)
3) Priority ranking:
   - must-have
   - should-have
   - later/defer
4) Recommended mobile admin ticket sequence
5) Notes on terminology alignment:
   - display "Instructor"
   - keep internal `tutor` schema/contracts unchanged

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep code changes minimal and documentation-heavy
- If small helper docs are created, keep them in docs/

## Files likely to touch
- docs/tickets-admin-01a-admin-audit-blueprint.md
- docs/admin-mobile-blueprint.md (new, recommended)
- optionally no code files at all unless a tiny non-behavioral helper is needed

## Acceptance criteria
- A clear admin audit/blueprint document exists
- Web admin functionality has been inventoried
- Mobile admin follow-up ticket sequence is proposed
- No apps/web behavior changes
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit

## Manual review
1) Read the generated admin blueprint doc
2) Confirm it clearly explains:
   - what exists now
   - what should come to mobile first
   - how future tickets should be sequenced