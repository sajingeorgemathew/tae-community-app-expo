# ADMIN-03 — Instructor list + course assignment

## Goal
Implement the mobile admin instructor-management surface:
- instructor-focused admin list
- instructor detail/admin controls
- course assignment management

## Why
After member management and admin safety guards, the next major admin function is managing instructors and their course assignments. This is central to the faculty/instructor side of the app and already has backend support in the current contract.

## Scope
This ticket should cover:
1) instructor-focused admin list
2) instructor detail/admin screen
3) course assignment UI
4) assignment add/remove behavior
5) consistent display language "Instructor"

## Explicitly included
### Instructor list
- admin-only list of instructors
- searchable/filterable if practical
- useful row/card summary:
  - avatar
  - name
  - role/display badge
  - listed/not listed
  - assigned course count if practical

### Instructor detail
- profile summary in admin context
- current course assignments
- admin controls for assignment updates

### Course assignment
- assign course(s) to instructor
- remove course assignment(s)
- reflect current assignments clearly
- use existing backend contract for tutor-course assignment data

## Explicitly NOT included
- No course CRUD in this ticket
- No bulk instructor operations
- No backend migrations/policies
- No apps/web behavior changes
- No final visual polish
- No super-admin implementation

## Important implementation note
Claude must inspect the real current backend/admin contract and determine:
- how instructors are identified in the existing system
- how current course data is queried
- how tutor/instructor course assignments are stored
- how assignments are created/removed
- whether `is_listed_as_tutor` and role both matter for inclusion in the admin instructor surface

Important terminology rule:
- UI should say "Instructor"
- internal fields/contracts may still be `tutor` / `is_listed_as_tutor` / tutor assignment tables

Claude must not invent fake course or assignment fields.

## Existing context
Already working:
- admin shell
- member list + member detail
- self-governance UI guards
- cross-admin UI guards
- faculty/directory surfaces
- instructor terminology alignment in mobile UI

## Expected behavior
### Instructor admin list
- accessible from Admin shell
- shows instructor-focused rows/cards
- tapping an instructor opens detail

### Instructor detail
- shows profile summary
- shows current assigned courses
- allows course assignment updates

### Assignment behavior
- admin can add an available course to an instructor
- admin can remove an assigned course
- UI reflects changes after success

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse existing profile/admin/navigation patterns where practical
- Keep UI simple and stable, not final polished

## Files likely to touch
- apps/mobile/src/screens/AdminScreen.tsx
- apps/mobile/src/screens/AdminInstructorsScreen.tsx (new)
- apps/mobile/src/screens/AdminInstructorDetailScreen.tsx (new)
- apps/mobile/src/navigation/* (admin route wiring)
- apps/mobile/src/lib/admin.ts or related helper module
- docs/tickets-admin-03-instructor-list-course-assignment.md

## Acceptance criteria
- Admin can open instructor list from Admin shell
- Admin can open instructor detail
- Current course assignments render
- Admin can add/remove course assignments using real contract
- Existing admin/member behavior remains stable
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
3) Open Instructors
4) Verify instructor list renders
5) Open an instructor detail
6) Verify current course assignments display
7) Add a course assignment
8) Remove a course assignment
9) Confirm UI updates correctly