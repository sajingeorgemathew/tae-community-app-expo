# MOBILE-03 — Me/Profile fetch + avatar signed URL

## Goal
Implement the first real Supabase data fetch in the mobile app:
- Fetch the authenticated user’s `profiles` row (`id = auth.uid()`).
- Display profile fields on Me screen.
- If `avatar_path` exists, generate a signed URL for display.

## Non-goals
- No profile editing yet
- No directory/feed/messages fetch yet
- No realtime/presence
- No complex caching or React Query

## Files to touch
- apps/mobile/src/screens/MeScreen.tsx
- apps/mobile/src/state/auth.tsx (only if needed for user id access)
- apps/mobile/src/state/profile.tsx (new)
- apps/mobile/src/lib/supabase.ts (only if needed)
- packages/shared (NO CHANGES expected)
- docs/tickets-mobile-03-me-profile-fetch.md (this file)

## Implementation plan
1) Create `apps/mobile/src/state/profile.tsx`
   - Expose:
     - `useMyProfile()` hook (loads profile once per session)
     - `refreshMyProfile()` (optional)
   - Use the existing Supabase singleton from `apps/mobile/src/lib/supabase.ts`.
   - Query:
     - `supabase.from("profiles").select("*").eq("id", userId).single()`
   - Type:
     - Use `Profile` from `@tae/shared`.
   - Handle missing profile gracefully with an error state.

2) Avatar signed URL
   - If profile has `avatar_path`, create signed URL:
     - Use shared helper from `@tae/shared` storage module (createSignedUrl / getPublicUrl depending on policy).
   - Assumption: avatar bucket is private → signed URL required.
   - Cache the signed URL in state; re-create only when `avatar_path` changes.

3) Update `MeScreen.tsx`
   - Render states:
     - Loading → spinner
     - Error → message + retry button
     - Success → show:
       - Avatar (signed url if any)
       - Name
       - Role
       - Any other safe fields
   - Add a manual refresh button.

## Testing / Verification
From repo root:
- npm run web:typecheck
- npm run web:build
From apps/mobile:
- npx tsc --noEmit
- npx expo start -c
Manual:
- Sign in
- Open Me tab
- Verify profile loads
- If avatar_path exists, verify avatar renders (otherwise placeholder)

## Acceptance criteria
- No TypeScript errors
- Me screen loads profile after sign-in
- Signed URL generation only happens when avatar_path exists
- Works in Expo Go (iOS)