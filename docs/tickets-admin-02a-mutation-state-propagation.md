# ADMIN-02A — Admin mutation state propagation fix

## Goal
Fix mobile state propagation after admin member updates so role, Instructor listing, and disabled-state changes are reflected across relevant mobile surfaces without requiring logout/login or app restart.

## Why
Admin member detail controls are working at the backend level, but the resulting changes are not reliably reflected across the mobile app. Examples observed:
- changing role/listing does not immediately reflect in Faculty
- disable/enable changes do not always reflect in related screens
- sometimes logout/login is needed to see changes

This is a mobile state propagation problem, not a backend contract problem.

## Scope
This ticket should cover:
1) identify which screens hold stale member/admin-derived state
2) add a practical refresh propagation strategy for admin mutations
3) ensure key affected surfaces refresh correctly after admin changes
4) preserve all current admin/member functionality

## Explicitly included
- refresh propagation after:
  - role change
  - Instructor listing toggle
  - disable/enable change
- affected mobile surfaces should update predictably, especially:
  - Faculty
  - Directory
  - profile/detail-related views where practical
  - any admin member list/detail states that should remain coherent

## Explicitly NOT included
- No super-admin implementation yet
- No cross-admin governance implementation yet
- No backend migrations/policies
- No apps/web behavior changes
- No realtime architecture
- No final UI polish

## Important implementation note
Claude must inspect the current mobile data flow and identify why admin mutations are not propagating correctly.

Possible causes may include:
- stale local state
- screens only fetching on mount/focus
- no shared invalidation signal after admin mutation
- separate fetch paths for Faculty/Directory/profile surfaces
- profile/role display mapping not recomputed after mutation

Claude should implement a practical mobile-side propagation strategy, such as:
- shared admin/member state change notifier/version bump
- targeted refetch triggers on relevant screens
- focus-aware refresh plus mutation-triggered refresh
- other lightweight invalidation pattern

Important:
- Do NOT overengineer a full global realtime system
- This is a state propagation fix for admin mutations only

## Existing context
Already working:
- ADMIN-02 member detail controls
- admin shell
- Faculty/Directory/member/profile screens
- SYS-01 terminology alignment
- governance blueprint and self-governance UI guards

## Expected behavior
### After admin changes a member
If admin updates:
- role
- Instructor listing
- disabled status

Then relevant screens should reflect the change without:
- logout/login
- app restart
- manual hard refresh through unrelated navigation tricks

### Important surfaces
At minimum:
- Faculty reflects Instructor listing/role changes correctly
- Directory reflects role/status changes correctly where relevant
- admin member detail/list remains coherent

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Keep the solution simple and stable, not overengineered

## Files likely to touch
- apps/mobile/src/screens/AdminMemberDetailScreen.tsx
- apps/mobile/src/screens/AdminMembersScreen.tsx
- apps/mobile/src/screens/FacultyScreen.tsx
- apps/mobile/src/screens/DirectoryScreen.tsx
- apps/mobile/src/state/* or small shared notifier/helper if needed
- docs/tickets-admin-02a-mutation-state-propagation.md

## Acceptance criteria
- Role/listing/disabled changes propagate reliably across mobile surfaces
- Faculty updates correctly after Instructor-related changes
- Directory updates correctly where relevant
- No logout/login required to see changes
- Existing admin member controls remain stable
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
2) Open Admin > Members
3) Change another member's role and save
4) Verify related mobile surfaces reflect the change
5) Change Instructor listing and save
6) Verify Faculty reflects the change without logout/login
7) Disable/enable a user and verify related state updates