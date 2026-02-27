# Expo Auth Strategy — TAE Community App

> EXPO-04 · Created 2026-02-26

## 1. Overview

This document defines the mobile authentication strategy for the TAE Community App
Expo client. It mirrors the web app's Supabase auth behavior while adapting for
React Native's constraints (no cookies, no server middleware).

### Web auth recap (source of truth)

| Concern | Web implementation |
|---|---|
| Client creation | `createBrowserClient(url, anonKey)` via `@supabase/ssr` |
| Session storage | Browser cookies (managed by `@supabase/ssr`) |
| Route protection | Next.js `middleware.ts` — checks `supabase.auth.getUser()` |
| Protected routes | `/app`, `/app/*` |
| Admin gate | `/app/admin/*` requires `profile.role === 'admin'` |
| Disabled check | `profile.is_disabled` → redirect to `/login?disabled=1` |
| Auth-only redirect | `/login`, `/signup` → redirect to `/app` if already signed in |
| Login method | Email + password (`signInWithPassword`) |
| Signup method | Email + password (`signUp`) with `full_name` metadata |

---

## 2. Session Persistence Plan

### Storage tiers

| Tier | Technology | When to use |
|---|---|---|
| **Primary** | `expo-secure-store` | Production builds, real devices. Encrypts at OS level. |
| **Fallback** | `@react-native-async-storage/async-storage` | Android emulator (SecureStore can be unreliable), CI, dev overrides. |
| **In-memory** | Plain JS `Map` | Unit tests, SSR-like contexts, no persistence needed. |

All three implement the shared `StorageAdapter` interface (see §7).

### Storage keys

| Key | Value | Notes |
|---|---|---|
| `tae_supabase_session` | Full Supabase session JSON (`{ access_token, refresh_token, ... }`) | Used by `supabase-js` via custom `storage` option |

> **Why a single key?** `supabase-js` manages its own session serialization
> when given a custom `storage` adapter. It stores/retrieves the complete
> session as a single JSON blob.

### Security constraints

- **Never** store `service_role` key on the client.
- The `anon` key is the only key shipped in the mobile bundle.
- SecureStore values are encrypted with the device keychain (iOS Keychain / Android Keystore).
- AsyncStorage values are **not** encrypted — only use for development / fallback.

---

## 3. Init Flow on App Start

```
App Cold Start
│
├── 1. Create Supabase client with StorageAdapter
│     └── createSupabaseClientWithAuthStorage({ url, anonKey, storageAdapter })
│
├── 2. Restore session
│     └── getInitialSession(client)
│         → calls client.auth.getSession()
│         → supabase-js reads from StorageAdapter automatically
│         → returns Session | null
│
├── 3. Set auth state
│     └── Store session in React state/context
│
├── 4. Subscribe to auth changes
│     └── subscribeToAuthChanges(client, callback)
│         → client.auth.onAuthStateChange(...)
│         → callback updates React state on SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
│
└── 5. Navigate
      └── getInitialRoute(hasSession)
          → true  → "AppStack" (main app)
          → false → "AuthStack" (login/signup)
```

---

## 4. Auth State Subscription

```typescript
client.auth.onAuthStateChange((event, session) => {
  // Events we care about:
  // - SIGNED_IN        → update state, navigate to AppStack
  // - SIGNED_OUT       → clear state, navigate to AuthStack
  // - TOKEN_REFRESHED  → update state (session has new tokens)
  // - USER_UPDATED     → update user metadata in state
});
```

The subscription returns an `unsubscribe` function. Must be called on cleanup
(e.g., when the auth provider unmounts — which in practice is never for a
root-level provider, but good hygiene).

---

## 5. Refresh Token Behavior

### Supabase-js config

```typescript
auth: {
  persistSession: true,       // use StorageAdapter
  autoRefreshToken: true,     // supabase-js handles refresh automatically
  detectSessionInUrl: false,  // no URL-based auth on mobile
  storage: storageAdapter,    // our StorageAdapter implementation
}
```

### AppState handling (foreground/background)

When the app returns to the foreground after backgrounding:

1. Listen to React Native `AppState` changes (`active` / `background`).
2. On `active`: call `client.auth.getSession()` to trigger a refresh check.
   - `supabase-js` with `autoRefreshToken: true` will automatically refresh
     if the access token is within the refresh window.
3. If the refresh fails (e.g., refresh token expired), `onAuthStateChange`
   fires `SIGNED_OUT` and the guard redirects to AuthStack.

> **Note:** This AppState logic lives in the Expo app layer (not in shared
> helpers), since it depends on React Native's `AppState` API.

---

## 6. Route Guard Plan (React Navigation)

### Stack structure

```
RootNavigator
├── AuthStack (unauthenticated)
│   ├── Login
│   └── Signup
└── AppStack (authenticated)
    ├── Home (/app)
    ├── ... other app screens
    └── AdminStack (role-gated)
        └── AdminDashboard (/app/admin)
```

### Guard rules (mirroring web middleware)

| Web route | Mobile equivalent | Guard rule |
|---|---|---|
| `/app`, `/app/*` | AppStack screens | Requires valid session |
| `/app/admin/*` | AdminStack screens | Requires `profile.role === 'admin'` |
| `/login`, `/signup` | AuthStack screens | Redirect to AppStack if already authenticated |

### Disabled user handling

On login, the mobile app should check `profile.is_disabled` (same query as web
middleware). If disabled, sign out and show an error message.

### Pure guard functions (shared)

The `guards.ts` module in `@tae/shared` provides platform-agnostic decision functions:

- `isProtectedRoute(routeName)` — returns `true` for routes that need auth
- `getInitialRoute(hasSession)` — returns `'AppStack' | 'AuthStack'`
- `shouldRedirect(routeName, hasSession)` — returns redirect target or `null`

These are pure functions with no React or navigation dependencies.

---

## 7. Shared Auth Helpers (`@tae/shared`)

### `packages/shared/src/auth/storage.ts`

- `StorageAdapter` interface: `getItem(key) → Promise<string | null>`, `setItem(key, value) → Promise<void>`, `removeItem(key) → Promise<void>`
- `AUTH_STORAGE_KEYS` constants
- `createInMemoryStorageAdapter()` — for tests

### `packages/shared/src/auth/session.ts`

- `createSupabaseClientWithAuthStorage({ url, anonKey, storageAdapter })` — factory
- `getInitialSession(client)` — calls `getSession()`, returns `Session | null`
- `subscribeToAuthChanges(client, callback)` — wraps `onAuthStateChange`, returns unsubscribe
- `signOutSafe(client)` — wraps `signOut()` with error handling

### `packages/shared/src/auth/guards.ts`

- `PROTECTED_ROUTE_PREFIXES` — mirrors web middleware matcher
- `isProtectedRoute(routeName)`
- `getInitialRoute(hasSession)`
- `shouldRedirect(routeName, hasSession)`

---

## 8. Security Notes

1. **No service role key on client** — only `SUPABASE_ANON_KEY` is bundled.
2. **SecureStore for production** — tokens are encrypted at rest.
3. **AsyncStorage only for dev** — not encrypted, only for emulator/CI fallback.
4. **No `detectSessionInUrl`** — disabled on mobile (no deep link auth flow yet).
5. **Profile checks** — disabled users are caught at login time and on session restore.
6. **Admin routes** — gated by `profile.role` check, same as web middleware.
