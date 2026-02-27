# EXPO-04 — Mobile auth strategy (SecureStore / AsyncStorage) + route guards

## Goal
Define and implement a mobile-ready Supabase auth/session strategy for Expo that mirrors the web app’s auth behavior:
- persistent session across app restarts
- reliable sign-in/sign-out
- route protection equivalent to Next.js middleware
- token refresh behavior handled safely

Deliverables include docs + shared helpers (platform-agnostic where possible), with Expo-specific storage adapter defined but implemented later when apps/mobile exists.

## Inputs
- docs/contracts/supabase-contract.md (EXPO-01)
- apps/web auth pattern:
  - middleware guards (src/middleware.ts now at apps/web/src/middleware.ts)
  - createBrowserClient/createServerClient usage
- packages/shared supabase client helper (EXPO-02)

## Non-goals
- No apps/mobile creation yet
- No UI/screens
- No changes to apps/web behavior
- No Supabase policy/schema changes

## Decisions to lock
1) Session storage:
   - Prefer SecureStore for refresh token/session where available
   - AsyncStorage fallback for Android emulator / dev scenarios (document this)
2) Auth initialization flow:
   - cold start -> restore session -> set auth state -> route to (auth/app)
3) Route guard strategy:
   - Replace middleware with React Navigation guard logic in Expo
4) Token refresh:
   - Use supabase-js built-in auto refresh
   - Ensure background/foreground handling is defined

## Deliverables
- docs/auth/expo-auth-strategy.md
- packages/shared/src/auth/:
  - storage.ts (interfaces + adapters contract)
  - session.ts (helpers: getInitialSession, subscribeAuth, signOut wrapper)
  - guards.ts (pure functions to decide route access, no React)
  - index.ts barrel exports
- Update packages/shared/src/index.ts exports

## Acceptance criteria
- Strategy doc is concrete (exact keys, lifecycle, guard rules)
- Shared helpers compile (TS)
- No changes to apps/web
- npm run web:typecheck and npm run web:build still pass

## Test plan
- npm run web:typecheck
- npm run web:build
- @tae/shared typecheck (if script exists)

---

## Implementation Log

### 2026-02-26 — Initial implementation

#### Files created
- `docs/auth/expo-auth-strategy.md` — full strategy doc covering session persistence, init flow, auth state subscription, refresh tokens, route guards, and security notes
- `packages/shared/src/auth/storage.ts` — `StorageAdapter` interface, `AUTH_STORAGE_KEYS` constants, `createInMemoryStorageAdapter()` for tests
- `packages/shared/src/auth/session.ts` — `createSupabaseClientWithAuthStorage()` factory, `getInitialSession()`, `subscribeToAuthChanges()`, `signOutSafe()`
- `packages/shared/src/auth/guards.ts` — `isProtectedRoute()`, `getInitialRoute()`, `shouldRedirect()` pure functions
- `packages/shared/src/auth/index.ts` — barrel exports

#### Files modified
- `packages/shared/src/index.ts` — added auth helper exports

#### Key decisions
1. **Single session key** (`tae_supabase_session`): supabase-js manages its own session serialization — we give it one storage key and let it handle the JSON blob.
2. **`detectSessionInUrl: false`**: mobile has no URL-based auth; deep link auth may be added later.
3. **Guard functions are pure**: no React, no navigation imports — just string-in / decision-out. The Expo app layer will wire these into React Navigation.
4. **In-memory adapter in shared**: avoids any platform dependency while giving tests a real adapter to use.
5. **Route name convention**: `AppStack`/`AuthStack` with screen names like `App`, `Login`, `Signup`, `Admin` — mirrors web path structure.

#### Web auth patterns documented
- `/app` and `/app/*` require auth (middleware checks `getUser()`)
- `/app/admin/*` requires `profile.role === 'admin'`
- `profile.is_disabled` blocks access with redirect to `/login?disabled=1`
- `/login` and `/signup` redirect authenticated users to `/app`
- Login uses `signInWithPassword`, signup uses `signUp` with `full_name` metadata
- Both flows upsert a `profiles` row after auth