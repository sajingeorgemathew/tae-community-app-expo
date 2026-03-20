# MOBILE-15 — Admin dashboard routing shell

## Goal
Add a mobile admin dashboard shell so admin users can access an admin-only area in the Expo app.

## Why
The web app includes admin functionality, and mobile needs an equivalent routing shell so the app architecture is complete before deeper admin features are implemented.

## Non-goals
- No full admin feature parity yet
- No member management actions yet
- No post moderation actions yet
- No invite/admin analytics implementation yet
- No backend migrations/policies

## Scope
This ticket should cover:
1) Add an Admin route entry point that is only visible/accessible to admin users
2) Create an Admin dashboard shell screen
3) Render a few placeholder admin cards/sections that link to future admin areas
4) Prevent non-admin users from seeing or opening admin-only routes

## Existing context
Already working:
- auth/session
- Me/profile fetch (role visible)
- Home/dashboard
- Feed
- Messages
- Questions
- Directory
- Faculty
- profile edit/avatar upload

## Expected behavior
### Admin visibility
- If current user is admin:
  - they can access an Admin route from a sensible place (likely More, Home, or Me)
- If current user is not admin:
  - they should not see the Admin entry point
  - direct route access should be blocked safely

### Admin shell screen
Should show a simple read-only shell such as:
- Admin Dashboard title
- cards/links for future sections like:
  - Manage Members
  - Moderate Posts
  - Review Questions
  - System / Metrics
These can be placeholders for now, but navigation structure should be ready.

## Data contract
Use the actual current user profile role from the existing profile/auth flow.
Do not invent a separate admin flag if the repo already uses `role = 'admin'`.

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep implementation simple and stable
- Reuse existing navigation patterns
- Admin route should be hidden for non-admins, not just visually disabled

## Files likely to touch
- apps/mobile/src/navigation/* (where admin route is introduced)
- apps/mobile/src/screens/AdminScreen.tsx (new)
- apps/mobile/src/screens/MoreScreen.tsx or Home/Me screen (where entry point is surfaced)
- docs/tickets-mobile-15-admin-shell.md

## Acceptance criteria
- Admin users can access an admin dashboard shell
- Non-admin users do not see/access admin route
- Admin shell screen renders without crashing
- Existing navigation remains stable
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
2) Confirm admin entry point is visible
3) Open Admin screen
4) Confirm shell renders
5) Sign in as non-admin (or simulate if available)
6) Confirm admin entry point is not visible
7) Confirm direct route access is blocked