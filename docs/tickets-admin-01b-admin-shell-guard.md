# ADMIN-01B — Admin route shell + guard

## Goal
Implement the first mobile admin screen as a guarded admin-only landing shell with clear section entry points for future admin features.

## Why
The admin blueprint identified the admin route shell and guard as the first must-have implementation step. Mobile needs:
- a secure admin entry point
- a clear admin landing screen
- navigation structure for future admin features

before deeper management screens are added.

## Scope
This ticket should cover:
1) admin-only entry point in mobile UI
2) admin guard / access control
3) admin landing shell screen
4) quick-link cards/sections for future admin areas

## Explicitly included
- Admin route entry point visible only to admins
- Protected Admin screen
- Read-only shell with future section cards, for example:
  - Members
  - Instructors
  - Posts Moderation
- Simple summary/intro text if useful
- Consistent use of display text "Instructor" where relevant

## Explicitly NOT included
- No member management implementation yet
- No instructor/course assignment implementation yet
- No posts moderation implementation yet
- No bulk actions
- No backend migrations/policies
- No apps/web behavior changes
- No final design polish

## Important implementation note
Claude must use the real current mobile auth/profile role logic and the existing admin access model.
The shell should be hidden from non-admin users in navigation/entry points, and direct access should be blocked safely.

Important terminology rule:
- user-facing UI may say "Instructor"
- internal role checks should continue to use existing real contract values such as `admin` and `tutor` if present
- do not rename backend schema/contracts

## Existing context
Already working:
- mobile role-aware auth/profile state
- admin blueprint completed
- messaging/feed/questions/faculty/directory surfaces already exist
- admin route shell may have earlier partial work, but this ticket should align it with the blueprint

## Expected behavior
### For admins
- Admin entry point is visible from the chosen location
- tapping it opens Admin shell
- Admin shell shows section cards/links for:
  - Members
  - Instructors
  - Posts Moderation
- cards can be placeholders/routes-to-come for now if target screens are not built yet

### For non-admins
- Admin entry point is not shown
- direct access is blocked safely

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse existing role/profile logic where practical
- Keep UI simple and stable, not final polished

## Files likely to touch
- apps/mobile/src/navigation/* (admin route wiring)
- apps/mobile/src/screens/AdminScreen.tsx
- apps/mobile/src/screens/MoreScreen.tsx or Home/Me screen (where entry point lives)
- docs/tickets-admin-01b-admin-shell-guard.md

## Acceptance criteria
- Admin entry point exists for admins only
- Non-admins do not see admin entry point
- Direct access is blocked for non-admins
- Admin shell renders without crashing
- Shell includes future section cards/links
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
2) Find Admin entry point
3) Open Admin shell
4) Verify Members / Instructors / Posts Moderation cards appear
5) Sign in as non-admin
6) Verify Admin entry point is hidden
7) Verify direct access is blocked safely if attempted