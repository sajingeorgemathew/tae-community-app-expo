# EXPO-PUSH-04 — Mobile token registration flow

## Goal
Implement the mobile push token lifecycle:
- request notification permission
- generate/store stable device ID
- fetch Expo push token
- upsert token into Supabase
- disable current device token row on sign-out
- handle token refresh

## Why
The app is now configured for push notifications and the `push_tokens` table exists, but no device token is being registered yet. This ticket connects the mobile app to the backend token table.

## Scope
This ticket should cover:
1) permission request after sign-in
2) stable device_id per install
3) get Expo push token
4) upsert into `push_tokens`
5) token refresh listener
6) disable current device row on sign-out

## Explicitly included
### Permission flow
- request permission after sign-in, not at cold app start
- handle granted / denied states safely
- do not crash if permission is denied

### Device identity
- generate a stable UUID on first launch
- store it locally in Expo SecureStore
- reuse it on subsequent launches

### Token persistence
- fetch Expo push token using projectId
- upsert into `public.push_tokens`
- update:
  - token
  - provider
  - platform
  - app_version if practical
  - enabled
  - last_seen_at

### Refresh lifecycle
- listen for push token changes
- upsert again when token rotates

### Sign-out cleanup
- disable current device row on sign-out
- do not leave the old account’s token enabled on shared device usage

## Explicitly NOT included
- No Edge Function sending yet
- No push triggers yet
- No foreground tap routing yet
- No credentials setup in this ticket
- No apps/web changes

## Important implementation note
Claude must follow the push architecture blueprint.

Key rules:
- request permission only after sign-in
- use a stable local device_id from SecureStore
- use Expo-compatible token fetch path
- preserve app stability if permission is denied or token fetch fails
- keep implementation mobile-only and scoped

Claude must inspect current auth/session flow and choose the cleanest place to:
- register token when a signed-in user is present
- disable token on sign-out
- avoid duplicate/looping writes

## Existing context
Already working:
- expo-notifications foundation
- `push_tokens` table + RLS
- Expo SecureStore dependency
- auth/session flow
- hosted Supabase backend

## Expected behavior
### Signed-in user
- app requests notification permission in context
- if granted, device gets/stores token
- token is upserted into Supabase

### Sign-out
- current device row is disabled for the current user

### Token changes
- rotated token re-upserts cleanly

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add send pipeline or triggers yet
- Keep changes focused to apps/mobile
- Keep behavior stable and fail-safe

## Files likely to touch
- docs/tickets-expo-push-04-token-registration.md
- apps/mobile/src/lib/notifications.ts
- apps/mobile/src/lib/supabase.ts or related mobile data helper
- apps/mobile/src/state/auth.tsx or related auth/session/sign-out path
- apps/mobile/src/config/env.ts or app config readers if needed

## Acceptance criteria
- permission request happens after sign-in
- stable device_id is stored and reused
- Expo push token is fetched when permission is granted
- token row is upserted into `push_tokens`
- current device token row is disabled on sign-out
- token refresh listener exists
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Use a real device + dev build
2) Sign in
3) Grant notification permission
4) Confirm a row appears in `push_tokens`
5) Sign out
6) Confirm that row is disabled
7) Sign back in and confirm token is re-enabled/upserted