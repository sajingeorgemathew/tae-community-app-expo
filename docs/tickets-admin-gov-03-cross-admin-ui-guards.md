# ADMIN-GOV-03 — Cross-admin UI guards

## Goal
Prevent regular admins from modifying other admins through mobile UI.

## Why
Currently, admins can:
- change other admins’ roles
- disable other admins

This is unsafe and contradicts the governance blueprint.

## Governance rule
- Admins cannot modify other admins
- Only super-admin (future) can do that
- For now, block at UI level

## Scope
This ticket should:
1) detect when target profile is admin
2) block dangerous controls for admin-to-admin actions
3) allow safe read-only access
4) show clear UI explanation

## Explicitly included
- role change blocked for admin targets
- disable toggle blocked for admin targets
- clear helper text for blocked actions

## Explicitly NOT included
- no backend enforcement yet
- no super-admin implementation yet
- no schema changes
- no apps/web changes

## Expected behavior

### Admin viewing another admin
- role controls disabled
- disable toggle disabled
- Instructor listing toggle allowed (per blueprint — cosmetic)

### Admin viewing normal member
- full controls still work

## UX requirement
- show helper text like:
  "Admins cannot modify other admin accounts"

## Files likely to touch
- apps/mobile/src/screens/AdminMemberDetailScreen.tsx

## Acceptance criteria
- cannot modify other admins
- cannot disable other admins
- UI clearly explains restriction
- normal member behavior unchanged
- web typecheck passes
- mobile typecheck passes

## Verification
- npm run web:typecheck
- npx tsc --noEmit

## Manual test
1) login as admin A
2) open admin B
3) confirm:
   - cannot change role
   - cannot disable
4) open normal member
5) confirm full controls still work