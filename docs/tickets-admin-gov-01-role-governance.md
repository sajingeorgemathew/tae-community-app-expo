# ADMIN-GOV-01 — Admin role governance blueprint

## Goal
Define a clear governance policy for admin powers, self-protection, future super-admin behavior, and role-change safety before implementing deeper admin controls.

## Why
The current admin controls already work functionally, but governance rules are still undefined or incomplete. Examples:
- self-disable is blocked
- self-role-change is still possible
- self Instructor toggle is still possible
- future multi-admin and super-admin behavior has not been formally defined

Without a governance blueprint, later admin features could become dangerous or inconsistent.

## Scope
This ticket should:
1) inspect the current admin/member management behavior
2) define governance rules for admin powers
3) define the future super-admin model
4) recommend safe implementation sequencing
5) identify which governance rules can be enforced in mobile UI only vs which require backend/schema changes later

## Explicitly included
- governance policy document
- recommended permission matrix
- recommended future implementation sequence
- guidance on super-admin design
- guidance on self-protection rules

## Explicitly NOT included
- No actual backend/schema implementation yet
- No migrations/policies yet
- No role model changes yet
- No apps/web behavior changes
- No mobile code changes beyond documentation if needed

## Governance questions this blueprint must answer
Claude should define recommended answers for the following:

### Self-governance
- Can an admin change their own role?
- Can an admin change their own Instructor listing?
- Can an admin disable themselves?
- Can an admin demote themselves accidentally?

### Cross-admin governance
- Can one admin change another admin’s role?
- Can one admin disable another admin?
- Can one admin remove another admin’s Instructor listing?
- Should peer-admin actions be restricted?

### Super-admin design
- Should super-admin exist?
- If yes, should super-admin be:
  - a real DB role
  - or a protected allowlist / protected user id / protected email strategy
- What actions should only super-admin be allowed to perform?
- Can anyone change/remove the super-admin?
- Should super-admin be protected from disable/demotion?

### Instructor semantics
- Should Instructor listing be treated as:
  - a normal display toggle
  - or a privileged/managed status
- Should admins be able to toggle it for themselves?
- Should role and Instructor listing be coupled or independent?

### Safety rules
- Which actions should require confirmation?
- Which actions should be hidden vs shown-disabled?
- Which rules must eventually be enforced at backend level, not only UI level?

## Important implementation note
Claude must inspect:
- current admin blueprint
- current mobile admin behavior already implemented
- current role/profile contract in the repo
- current internal `tutor` / `is_listed_as_tutor` semantics

Important terminology rule:
- user-facing UI says "Instructor"
- internal schema/contracts can remain `tutor`-based for now

The output should clearly distinguish:
1) what can be done now in mobile UI
2) what should eventually be enforced in backend/schema/RLS
3) what should wait until a true super-admin implementation ticket

## Existing context
Already working:
- admin shell
- member detail admin controls
- self-disable protection
- role change
- Instructor listing toggle
- profile/admin state in mobile
- admin mobile blueprint already exists

## Expected output
This ticket should produce a governance blueprint document that includes:

1) Recommended admin permission matrix
2) Recommended self-protection rules
3) Recommended super-admin model
4) Recommended implementation sequence
5) Distinction between:
   - UI-only guard
   - backend-required enforcement
6) Notes for future web/mobile/backend alignment

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep changes documentation-heavy
- If any code changes are made, they should be minimal and non-behavioral

## Files likely to touch
- docs/tickets-admin-gov-01-role-governance.md
- docs/admin-role-governance-blueprint.md (new, recommended)

## Acceptance criteria
- A clear governance blueprint exists
- Self-governance rules are explicitly defined
- Super-admin direction is explicitly defined
- Safe implementation sequence is proposed
- No apps/web behavior changes
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit

## Manual review
1) Read the governance blueprint
2) Confirm it clearly answers:
   - self role change
   - self disable
   - cross-admin actions
   - super-admin model
   - Instructor toggle rules
   - what must be backend-enforced later