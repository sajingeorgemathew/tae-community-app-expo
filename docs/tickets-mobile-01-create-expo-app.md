# MOBILE-01 — Create Expo app in apps/mobile and wire monorepo

## Goal
Create an Expo React Native app under `apps/mobile/` and connect it to `@tae/shared`:
- Session persistence via SecureStore adapter
- Supabase client creation via `createSupabaseClientWithAuthStorage`
- Minimal bootstrap UI to verify auth state + persistence

## Non-goals
- No full navigation setup (later ticket)
- No feature screens (feed/messages/profile) yet
- No Supabase schema/policy changes
- No changes to apps/web

## Deliverables
- `apps/mobile/` Expo app (TypeScript)
- `apps/mobile/package.json` with name `@tae/mobile` and dependency on `@tae/shared`
- Root scripts to run mobile from repo root:
  - mobile:start, mobile:android, mobile:ios, mobile:web (optional)
- SecureStore storage adapter implementing `StorageAdapter` interface from `@tae/shared/auth`
- Supabase client init + auth bootstrap screen:
  - Shows session status (signed in/out)
  - Allows sign out
  - (Optional) Email/password sign-in form (can be stubbed)

## Env vars
Use Expo public env vars:
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY

## Acceptance criteria
- `npm install` works at repo root
- `npm -w @tae/shared` typecheck still passes
- Expo app starts via `npm run mobile:start` (or `npx expo start` in apps/mobile)
- App restores session after reload (SecureStore persistence verified)
- No apps/web files changed

## Test plan
- Root:
  - npm install
  - npx tsc --noEmit -p packages/shared/tsconfig.json
- Mobile:
  - npm run mobile:start
  - Login once (if form implemented) then reload app → still logged in
  - Sign out → session cleared

---

## Implementation notes

### Files added

```
apps/mobile/
├── .env.example                  # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
├── App.tsx                       # Bootstrap UI: loading → signed-out (sign-in form) / signed-in (sign-out button)
├── app.json                      # Expo config (slug: tae-community)
├── babel.config.js               # babel-preset-expo
├── metro.config.js               # Monorepo-aware Metro config (watchFolders + nodeModulesPaths)
├── package.json                  # @tae/mobile — deps: expo, expo-secure-store, @tae/shared, etc.
├── tsconfig.json                 # extends expo/tsconfig.base, strict mode
└── src/
    ├── config/
    │   └── env.ts                # Reads EXPO_PUBLIC_* env vars
    └── lib/
        ├── storageAdapter.ts     # SecureStore adapter implementing StorageAdapter (in-memory fallback)
        └── supabase.ts           # Singleton Supabase client via createSupabaseClientWithAuthStorage
```

Root `package.json` — added scripts:
- `mobile:start`, `mobile:android`, `mobile:ios`, `mobile:web`

### How to run

```bash
# 1. Install dependencies from repo root
npm install

# 2. Set env vars — copy and fill in
cp apps/mobile/.env.example apps/mobile/.env

# 3. Start Expo dev server
npm run mobile:start
# or from apps/mobile: npx expo start
```

### How to set env vars

1. Copy the example env file:
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   ```

2. Fill in your Supabase project values in `apps/mobile/.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Converting from Next.js (apps/web) env vars**:
   If you already have `apps/web/.env.local`, copy the Supabase values but rename the prefix:
   | apps/web (.env.local)              | apps/mobile (.env)               |
   |------------------------------------|----------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`         | `EXPO_PUBLIC_SUPABASE_URL`       |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`    | `EXPO_PUBLIC_SUPABASE_ANON_KEY`  |

Expo makes `EXPO_PUBLIC_*` variables available at build time via `process.env`.
The app will throw a clear error on startup if these vars are missing.

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "supabaseUrl is required" | Missing `.env` file or empty values | Copy `.env.example` → `.env` and fill in values |
| "Unable to resolve module ../../App from expo/AppEntry.js" | Stale Metro cache or wrong entry resolution | Clear cache: `npx expo start --clear` |
| "Project is incompatible with this version of Expo Go" | Expo Go app version doesn't match SDK version | Update Expo Go to match SDK 54, or use `npx expo start` with dev client |

### Persistence verification

- **SecureStore adapter** (`src/lib/storageAdapter.ts`) wraps `expo-secure-store` which stores data in the iOS Keychain / Android Keystore.
- On platforms where SecureStore is unavailable (e.g. Expo Go web), the adapter falls back to an in-memory `Map` and logs a warning.
- The Supabase client is created with `persistSession: true` and `autoRefreshToken: true`, so sessions are automatically stored/restored via the adapter.
- **To verify**: sign in → close and reopen the app → session should be restored automatically (on native).
