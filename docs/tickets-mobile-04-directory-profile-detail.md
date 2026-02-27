# MOBILE-04 — Directory list + Profile detail route (read-only)

## Goal
Implement Directory on mobile:
1) Directory tab shows a list of profiles (name, role, program/grad year if available, avatar if present).
2) Tapping a profile opens a Profile Detail screen with read-only info.
3) Uses @tae/shared types + shared supabase client + signed URL helper (if needed) for avatar.

## Non-goals
- No editing profile.
- No uploading avatar.
- No advanced search/filter UI (optional minimal search box ok if trivial).
- No pagination optimization beyond a simple limit (ok to add later).
- No parity with web styling; keep clean and functional.

## Requirements / Constraints
- Must work with current RLS (profiles select allowed for authenticated).
- No hardcoded IDs.
- Avoid battery-draining polling.
- Prefer simple loading/error states.
- Don’t break existing MOBILE-02 navigation/auth.

## Data contract (expected)
- `profiles` table: select list (id, full_name/name fields, role, avatar_path, headline/bio, program/grad_year fields if present).
- If there is no stable “display name” column, implement a safe fallback order:
  full_name → display_name → name → email prefix → "Unknown"
- Avatar:
  - If `avatar_path` exists, show it.
  - If buckets are private, use signed URL helper (from @tae/shared storage urls) and cache in state.
  - If no avatar, show initial circle.

## Files to touch
- apps/mobile/App.tsx (only if needed)
- apps/mobile/src/navigation/AppTabs.tsx
- apps/mobile/src/navigation/RootNavigator.tsx (or a new nested stack for Directory)
- apps/mobile/src/screens/DirectoryScreen.tsx (replace placeholder)
- apps/mobile/src/screens/ProfileDetailScreen.tsx (new)
- apps/mobile/src/lib/supabase.ts (reuse)
- packages/shared (only if absolutely necessary; avoid unless missing types)

## Implementation steps
1) Add a Directory stack navigator:
   - DirectoryScreen
   - ProfileDetailScreen (route param: profileId)
2) DirectoryScreen:
   - Fetch profiles on mount (limit 50/100).
   - Render FlatList.
   - Each row shows avatar + name + secondary line.
   - Tap navigates to ProfileDetail with profileId.
3) ProfileDetailScreen:
   - Fetch profile by id.
   - Render read-only: avatar, name, role, headline/bio, program/grad year.
4) Avatar URL:
   - If avatar_path exists, resolve a URL (public or signed) in a small helper.
   - Keep it simple: request signed URL per row only if needed; cache results by path.
5) Ensure type safety:
   - Use @tae/shared Profile type if present.
   - If columns differ in mobile vs types, map carefully and keep optional.
6) Add minimal loading + error UI.

## Acceptance criteria
- `npm run mobile:start` loads.
- Directory shows a list for authenticated user.
- Tapping a user opens detail screen.
- No crashes if profile fields are null/missing.
- No changes to apps/web build/typecheck.
- `npm run web:typecheck` still passes.

## Verification commands
- From repo root:
  - npm run web:typecheck
- From apps/mobile:
  - npx tsc --noEmit
  - npx expo start --clear (manual test)

## Notes
- Keep styles minimal.
- Prefer React Navigation patterns already used in MOBILE-02.