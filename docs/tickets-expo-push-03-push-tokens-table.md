# EXPO-PUSH-03 — push_tokens table + RLS

## Goal
Create the Supabase backend foundation for Expo push token persistence:
- `push_tokens` table
- indexes
- RLS policies
- no token registration flow yet

## Why
The mobile app is now configured for notifications, but we still need a place to persist push tokens per user/device. This table will support:
- multiple devices per user
- soft disable of stale tokens
- future Edge Function fan-out
- ownership-safe RLS

## Scope
This ticket should cover:
1) `push_tokens` table
2) indexes
3) RLS policies
4) migration file(s)
5) no app token writes yet

## Explicitly included
### Table design
Recommended fields:
- id
- user_id
- device_id
- token
- provider
- platform
- app_version
- enabled
- last_seen_at
- created_at

### RLS
- owner can read their own rows
- owner can insert their own rows
- owner can update their own rows
- owner can delete their own rows

### Constraints
- unique `(user_id, device_id)`
- provider/platform checks
- useful index for enabled-token lookup

## Explicitly NOT included
- No mobile token registration yet
- No permission request
- No send Edge Function
- No triggers
- No credentials
- No apps/web changes

## Important implementation note
Claude should follow the push architecture blueprint closely.

Preferred design:
- support multiple devices per user
- allow soft-disable through `enabled`
- support provider evolution via `provider` column
- keep service-role reads possible for later send pipeline

Critical output requirement:
- Claude must create migration file(s) under `supabase/migrations`
- Claude must clearly separate SQL code from explanation
- Claude must make it easy for the user to copy SQL into hosted Supabase SQL editor

## Existing context
Already working:
- Expo mobile app configured with `expo-notifications`
- hosted Supabase backend
- push architecture blueprint exists

## Expected behavior
After this ticket:
- `push_tokens` table exists in Supabase
- RLS is enabled
- owner-only read/write works
- system is ready for the next ticket: mobile token registration flow

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add token registration logic yet
- Keep changes focused to Supabase migration/docs only unless a tiny shared type/helper is justified
- Keep the design simple and future-proof

## Files likely to touch
- docs/tickets-expo-push-03-push-tokens-table.md
- supabase/migrations/* (new migration)

## Acceptance criteria
- `push_tokens` table migration exists
- RLS policies exist
- constraints/indexes exist
- SQL is clearly available for hosted Supabase execution
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit

## Manual test
1) Run the SQL in hosted Supabase
2) Confirm table exists
3) Confirm RLS is enabled
4) Confirm no app regressions