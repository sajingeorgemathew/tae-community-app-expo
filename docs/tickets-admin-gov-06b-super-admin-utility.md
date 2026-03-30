# ADMIN-GOV-06B — Shared isSuperAdmin() utility + mobile config

## Goal
Implement the shared super-admin identity utility and mobile configuration plumbing, without yet changing admin UI permissions.

## Why
The super-admin governance blueprint recommends an environment-configured user-ID allowlist model. Before we can safely lift any cross-admin UI restrictions for super-admins, we need a clean, centralized identity check.

## Scope
This ticket should cover:
1) shared `isSuperAdmin(userId)` utility
2) mobile config wiring for `SUPER_ADMIN_IDS`
3) safe fallback behavior when unset
4) no permission/UI behavior change yet

## Explicitly included
- shared utility function
- mobile config plumbing
- internal documentation/comments where useful
- safe no-super-admin fallback

## Explicitly NOT included
- No mobile admin behavior changes yet
- No backend enforcement yet
- No apps/web alignment in this ticket
- No schema changes
- No audit logging

## Important implementation note
The super-admin blueprint chose:
- environment-configured user-ID allowlist
- super-admin remains `role = "admin"` in database
- super-admin is a governance overlay, not a schema role

This ticket must preserve that model exactly.

### Requirements
- Use `SUPER_ADMIN_IDS` as the source of truth
- For mobile, use Expo-compatible config access (for example `app.config.ts` / `expo-constants` extra config)
- Expose a small utility such as:
  - `isSuperAdmin(userId: string): boolean`
- Safe default:
  - if env/config is missing or empty, no user is super-admin
  - system must fail closed

## Existing context
Already working:
- admin governance blueprint
- super-admin governance blueprint
- admin shell and admin controls
- cross-admin UI guards currently block all admins from modifying other admins

## Expected behavior
### Internal behavior only
- Mobile/shared code can now resolve whether a user is super-admin
- No visible UI changes yet
- Current admin UI behavior should remain unchanged in this ticket

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep changes focused to shared/mobile config + helper code
- Do not implement super-admin-aware UI logic yet

## Files likely to touch
- docs/tickets-admin-gov-06b-super-admin-utility.md
- packages/shared/src/* (if shared helper is placed there)
- apps/mobile/app.config.ts or equivalent Expo config file
- apps/mobile/src/lib/* (mobile helper if needed)

## Acceptance criteria
- Shared/mobile `isSuperAdmin()` utility exists
- Mobile config can read `SUPER_ADMIN_IDS`
- Empty/missing config fails closed safely
- No UI behavior changes yet
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit

## Manual review
1) Inspect the helper implementation
2) Confirm config source is documented
3) Confirm current mobile admin behavior is unchanged in this ticket