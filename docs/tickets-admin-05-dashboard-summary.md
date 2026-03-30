# ADMIN-05 — Admin dashboard summary

## Goal
Upgrade the mobile Admin landing page into a useful dashboard summary screen with key counts and quick links to the main admin work areas.

## Why
The admin shell already exists, and the following admin surfaces are now implemented:
- Members
- Instructors
- Posts Moderation

So the Admin landing page should now summarize the most important admin information and act as the main entry point to those screens.

## Scope
This ticket should cover:
1) admin dashboard summary cards
2) key admin counts
3) quick links to admin work areas
4) clear loading/error/empty states as needed

## Explicitly included
### Summary cards
Practical mobile summary cards for metrics such as:
- total members
- total instructors
- disabled users
- recent/visible posts count if practical

### Quick links
Clear entry cards/buttons for:
- Members
- Instructors
- Posts Moderation

### Admin landing UX
- better top-level structure
- clearer admin overview
- mobile-friendly grouping of summary + actions

## Explicitly NOT included
- No new admin management surface in this ticket
- No backend migrations/policies
- No apps/web behavior changes
- No realtime dashboard metrics
- No analytics suite
- No final visual polish

## Important implementation note
Claude must inspect the current mobile admin implementation and current backend/query contract to determine:
- what counts can be fetched cheaply and safely
- what existing screens/routes should be linked from the dashboard
- how to keep the dashboard useful without overbuilding

Claude should prefer a practical summary over a heavy analytics dashboard.

Important terminology rule:
- UI says "Instructor"
- internal tutor-based schema/contracts remain unchanged

## Existing context
Already working:
- admin shell and guard
- member list + member detail
- instructor list + course assignment
- posts moderation
- admin governance UI guards
- mobile routing for admin sections

## Expected behavior
### Admin dashboard
- shows useful top-level summary cards
- shows quick links to:
  - Members
  - Instructors
  - Posts Moderation
- feels like a real admin home, not just placeholders

### Counts
- counts should reflect real backend data where practical
- loading/error handling should be stable
- if some count is not cheaply available, use a practical approximation and explain it

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse existing admin routes/screens where practical
- Keep UI simple and stable, not final polished

## Files likely to touch
- apps/mobile/src/screens/AdminScreen.tsx
- apps/mobile/src/lib/admin.ts or small admin helper module
- docs/tickets-admin-05-dashboard-summary.md

## Acceptance criteria
- Admin landing page shows useful summary cards
- Admin landing page links clearly to Members / Instructors / Posts Moderation
- Existing admin routes remain stable
- Counts load from real backend data where practical
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Sign in as admin
2) Open Admin
3) Verify summary cards render
4) Verify Members / Instructors / Posts Moderation quick links work
5) Confirm dashboard remains stable