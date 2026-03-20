# MOBILE-14 — Avatar upload

## Goal
Add avatar upload to the mobile app so the signed-in user can choose an image from device, upload it to the correct storage bucket/path, update their profile row, and immediately see the new avatar in the Me screen.

## Non-goals
- No image cropping UI unless trivial
- No delete avatar action in this ticket
- No admin profile editing
- No final avatar polish/caching strategy overhaul
- No backend migration/policy changes

## Scope
This ticket should cover:
1) Add avatar upload entry point in the Me/Profile area
2) Pick an image from device
3) Upload image to the correct avatar bucket/path using current contract
4) Update `profiles.avatar_path`
5) Refresh profile/Me screen after save so the new avatar appears

## Existing context
Already working:
- auth/session
- Me screen profile fetch
- profile edit
- signed URL helpers
- shared storage path strategy
- Expo app can access device media via compatible packages if installed

## Expected behavior
### Me screen
- Existing avatar area should expose an "Upload Avatar" or "Change Avatar" action
- User selects an image from device
- Upload begins
- On success:
  - profile row updates with new avatar path
  - Me screen refreshes and shows new avatar
- On failure:
  - show useful error
  - do not break the existing avatar display

## Data contract
Use actual backend/storage contract already present in repo:
- correct avatar bucket name
- correct avatar path convention
- correct update field in `profiles` (`avatar_path` or real equivalent)
- if private bucket requires signed URL, keep using the existing signed URL helper flow

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep implementation simple and stable
- Use Expo-compatible image picker for Expo Go
- Follow existing shared storage helpers/path rules where practical

## Files likely to touch
- apps/mobile/src/screens/MeScreen.tsx
- apps/mobile/src/screens/EditProfileScreen.tsx (only if avatar entry point lives there)
- apps/mobile/src/lib/profile.ts or storage helper wrapper (optional)
- apps/mobile/package.json
- docs/tickets-mobile-14-avatar-upload.md

## Acceptance criteria
- Signed-in user can choose an avatar image from device
- Upload succeeds
- `profiles.avatar_path` updates correctly
- New avatar appears on Me screen after refresh
- Existing profile edit still works
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
3) Trigger avatar upload
4) Pick an image
5) Confirm upload succeeds
6) Confirm avatar updates on screen
7) Close/reopen app and confirm avatar persists