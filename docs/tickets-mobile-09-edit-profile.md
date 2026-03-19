# MOBILE-09 — Edit my profile

## Goal
Add profile editing to the mobile app so the signed-in user can update their own profile from the existing Me route/flow.

## Non-goals
- No avatar upload in this ticket
- No admin-only profile editing
- No full parity with the web profile page yet
- No profile completeness logic changes
- No new backend migrations/policies

## Scope
This ticket should cover:
1) Add an Edit Profile screen/flow from the Me screen
2) Load current profile values into a form
3) Update the signed-in user's row in `profiles`
4) Refresh the Me screen after save
5) Handle loading / success / error states cleanly

## Existing context
Already working:
- auth/session
- Me screen profile fetch
- navigation and route structure
- signed-in user access to their own profile

## Expected behavior
### Me screen
- Existing profile display remains
- Add an "Edit Profile" button
- Tapping it opens an EditProfile screen

### EditProfile screen
Form should allow editing commonly used safe fields only:
- full_name
- headline
- program
- grad_year
- current_work
- qualifications
- experience
- skills

If some of these fields are absent in the actual shared type/schema, Claude should use the real available profile fields and keep the form aligned with the current contract.

### Save behavior
- Save updates only the signed-in user's profile row
- On success:
  - navigate back to Me screen
  - Me screen refreshes and shows updated values
- On failure:
  - show useful error
  - do not lose current form state

## Technical constraints
- Do NOT change apps/web
- Do NOT touch admin-only fields (role, is_disabled, etc.)
- Use the existing Supabase client in apps/mobile/src/lib/supabase.ts
- Use auth state for current user id
- Use @tae/shared types where practical
- Keep implementation simple and stable

## Files likely to touch
- apps/mobile/src/screens/MeScreen.tsx
- apps/mobile/src/screens/EditProfileScreen.tsx (new)
- apps/mobile/src/navigation/ProfileStack.tsx OR existing stack wiring (if needed)
- apps/mobile/src/state/profile.tsx (if refresh logic needs extension)
- docs/tickets-mobile-09-edit-profile.md

## Acceptance criteria
- Signed-in user can open Edit Profile
- Existing values prefill correctly
- Save updates the correct profile row
- Me screen shows updated values after save
- No crashes when optional fields are null
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
2) Open Me
3) Tap Edit Profile
4) Change one or more fields
5) Save
6) Verify Me screen updates
7) Reopen app and confirm value persists