# MOBILE-13A — Navigation rebalance after Home dashboard

## Goal
Rebalance the signed-in mobile navigation now that Home exists as a real member dashboard.

## Why
After adding Home, Faculty disappeared from primary navigation while Directory is already accessible from Home. We need a cleaner top-level nav structure before adding more features.

## Desired outcome
Top-level member navigation should stay coherent and not overcrowded.

Preferred direction:
- Keep Home as a primary tab
- Keep Feed as a primary tab
- Keep Messages as a primary tab
- Restore Faculty as a primary tab
- Keep Me as a primary tab
- Move Directory out of the primary tab bar if Home already links to it

Directory should remain reachable:
- from Home shortcut
- and/or via an overflow / more pattern later if needed

## Non-goals
- No UI redesign
- No new data fetching logic
- No avatar upload
- No admin dashboard in this ticket
- No new “More” page unless absolutely necessary

## Scope
This ticket should cover:
1) Rebalance primary tab structure
2) Restore Faculty route visibility
3) Preserve Directory access from Home
4) Ensure existing navigation still works without broken routes

## Existing context
Already working:
- Home dashboard
- Feed
- Messages
- Directory list/detail
- Questions list/detail
- Me/profile
- Faculty route work exists in app history / code path

## Technical constraints
- Do NOT change apps/web
- Keep changes focused to apps/mobile navigation
- Reuse existing stack navigators/screens
- Do not delete working screens; only rebalance how users reach them
- Keep the structure future-friendly for:
  - Avatar upload
  - Admin shell
  - later enrichment

## Files likely to touch
- apps/mobile/src/navigation/AppTabs.tsx
- apps/mobile/src/navigation/* (if tab/stack imports need rewire)
- apps/mobile/src/screens/HomeScreen.tsx (only if Directory shortcut label/navigation needs adjustment)
- docs/tickets-mobile-13a-navigation-rebalance.md

## Acceptance criteria
- Home remains visible in primary navigation
- Faculty is restored and reachable from primary navigation
- Directory remains reachable from Home
- Existing routes do not break
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Sign in
2) Confirm primary tabs now reflect the new structure
3) Open Home
4) Use Home to access Directory
5) Open Faculty from primary nav
6) Confirm Feed, Messages, Me still work