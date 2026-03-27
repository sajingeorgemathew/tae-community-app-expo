# ADMIN-02 — Member list + member detail

## Goal
Implement the core mobile admin member-management surface:
- searchable member list
- member detail view
- role change
- instructor listing toggle
- disable/enable user
- self-protection so admin cannot disable themselves

## Why
This is the core operational admin surface and one of the most important must-have admin functions for mobile. The admin blueprint identified this as a Phase 1 priority, and the backend/RLS already supports the core profile admin update flows.

## Scope
This ticket should cover:
1) searchable member list
2) member detail screen/sheet
3) profile summary in admin context
4) role update
5) instructor listing toggle
6) enable/disable user
7) self-protection rule for current admin

## Explicitly included
### Member list
- searchable list of members
- useful summary row/card per member
- role/status display
- disabled state visible
- tap to open member detail

### Member detail
- profile summary
- role display and editable role control
- instructor listing toggle
- disable/enable user control
- clear loading/success/error states

### Self-protection
- current admin cannot disable themselves
- current admin cannot accidentally lock themselves out via disable control

## Explicitly NOT included
- No bulk operations in this ticket
- No course assignment in this ticket
- No posts moderation in this ticket
- No backend migrations/policies
- No apps/web behavior changes
- No final visual polish

## Important implementation note
Claude must inspect the real current profile/admin contract and determine:
- how member rows are queried
- which profile fields are available and useful for list/detail summary
- how admin role updates are currently supported
- how `is_disabled` is updated
- how `is_listed_as_tutor` (or equivalent internal field) is updated
- how current admin identity is determined for self-protection

Important terminology rule:
- UI should say "Instructor" where user-facing
- internal fields/values such as `tutor` or `is_listed_as_tutor` remain unchanged

Claude must follow the real backend contract and not invent admin fields or permissions.

## Existing context
Already working:
- mobile admin shell + guard
- profile detail patterns
- SYS-01 terminology alignment
- mobile role/profile/auth state
- existing admin blueprint

## Expected behavior
### Member list
- admin can open Members from Admin shell
- see searchable member list
- each row shows key info such as:
  - avatar
  - name
  - role
  - disabled state if applicable
- tapping a member opens detail

### Member detail
- shows profile summary
- allows changing role
- allows toggling Instructor listing status
- allows disable/enable of the member
- save actions reflect in UI after success

### Self-protection
- if the viewed member is the current admin themselves:
  - disable action must be blocked or unavailable
  - role/status controls should avoid self-lockout behavior where appropriate

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse current admin/profile/messaging/navigation patterns where practical
- Keep UI simple and stable, not final polished

## Files likely to touch
- apps/mobile/src/screens/AdminScreen.tsx
- apps/mobile/src/screens/AdminMembersScreen.tsx (new)
- apps/mobile/src/screens/AdminMemberDetailScreen.tsx (new)
- apps/mobile/src/navigation/* (admin route wiring)
- apps/mobile/src/lib/admin.ts or profile/admin helpers (optional)
- docs/tickets-admin-02-member-list-detail.md

## Acceptance criteria
- Admin can open searchable member list
- Admin can open member detail
- Role change works using real contract
- Instructor listing toggle works using real contract
- Disable/enable works using real contract
- Admin cannot disable themselves
- Existing admin shell remains stable
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
3) Open Members
4) Search for a member
5) Open member detail
6) Change role if allowed
7) Toggle Instructor listing
8) Disable or enable a member
9) Verify self-disable is blocked on your own admin account