# EXPO-PUSH-02 — Mobile install/config for expo-notifications

## Goal
Install and configure the Expo mobile app for push notifications, without yet implementing token registration, backend storage, or notification sending.

## Why
Push notifications require the mobile app to be configured first:
- dependency installed
- Expo config/plugin wired
- Android notification channel defaults set
- iOS permission strings/config prepared
- app-level notification handler foundation added

This ticket is the first implementation step after the push architecture blueprint.

## Scope
This ticket should cover:
1) install `expo-notifications`
2) wire Expo config/plugin for notifications
3) add Android notification channel foundation
4) add app-level notification handler foundation
5) keep the app stable with no actual token registration yet

## Explicitly included
- `expo-notifications` dependency
- Expo plugin/config changes in mobile
- mobile-safe notification handler setup
- Android default channel setup
- iOS config strings if needed
- minimal app bootstrap integration if needed

## Explicitly NOT included
- No push token table
- No token registration flow
- No backend send pipeline
- No Edge Function
- No credentials upload yet
- No real notification triggers yet
- No apps/web changes

## Important implementation note
Claude must keep this ticket narrow:
- mobile install/config only
- no Supabase migrations
- no token upsert logic yet
- no send logic yet

Use the current Expo mobile architecture and app config conventions already in the repo.

Important:
- keep changes compatible with future EAS/dev build flow
- do not commit secrets
- keep current app behavior stable

## Existing context
Already working:
- Expo mobile app
- auth/session flow
- messaging and Q&A surfaces
- app.config.ts exists
- push architecture blueprint exists

## Expected behavior
After this ticket:
- the app is configured to support notifications
- notification handler foundation exists
- the app still builds and runs
- no visible push feature is expected yet

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile and config
- Keep implementation minimal and stable

## Files likely to touch
- docs/tickets-expo-push-02-mobile-install-config.md
- apps/mobile/package.json
- apps/mobile/app.config.ts
- apps/mobile/src/* app bootstrap or notification bootstrap file(s)

## Acceptance criteria
- `expo-notifications` is installed
- Expo config/plugin is wired for notifications
- Android notification channel setup exists
- app-level notification handler foundation exists
- app still typechecks
- web typecheck still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit

## Manual test
1) Install dependencies
2) Start the app/dev build path normally
3) Confirm app boots without regression
4) Confirm notification config code is in place for later tickets