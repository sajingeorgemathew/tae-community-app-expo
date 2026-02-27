# MOBILE-02 — Navigation skeleton + auth guard routing

## Summary

Adds React Navigation to `apps/mobile` with auth-guarded routing:

- **Signed out** → Auth stack (SignIn screen with email/password)
- **Signed in** → Bottom tab navigator with 4 tabs: Feed, Messages, Directory, Me
- **Auth state** centralized in `AuthProvider` context using `@tae/shared` helpers
- Session restored on boot, auth changes subscribed/unsubscribed cleanly
- MeScreen includes Sign Out button that routes back to SignIn

## Files changed / created

### Modified
- `apps/mobile/package.json` — added React Navigation dependencies
- `apps/mobile/App.tsx` — replaced inline auth/views with NavigationContainer + AuthProvider + RootNavigator

### Created
- `apps/mobile/src/state/auth.tsx` — AuthProvider context + `useAuth` hook
- `apps/mobile/src/navigation/AuthStack.tsx` — native stack with SignIn screen
- `apps/mobile/src/navigation/AppTabs.tsx` — bottom tabs (Feed, Messages, Directory, Me)
- `apps/mobile/src/navigation/RootNavigator.tsx` — loading → AuthStack / AppTabs based on session
- `apps/mobile/src/screens/SignInScreen.tsx` — email + password sign-in form
- `apps/mobile/src/screens/FeedScreen.tsx` — placeholder
- `apps/mobile/src/screens/MessagesScreen.tsx` — placeholder
- `apps/mobile/src/screens/DirectoryScreen.tsx` — placeholder
- `apps/mobile/src/screens/MeScreen.tsx` — user info + Sign Out button

### Dependencies added
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `@react-navigation/bottom-tabs`
- `react-native-screens`
- `react-native-safe-area-context`

## Verification commands

From repo root:

```bash
# Install all workspace dependencies
npm install

# TypeScript checks
cd apps/mobile && npx tsc --noEmit
npx tsc --noEmit -p packages/shared/tsconfig.json

# Start Expo dev server
cd apps/mobile && npx expo start -c
```

## Manual testing

1. `npx expo start -c` from `apps/mobile`
2. Open in Expo Go
3. Should see SignIn screen (signed out state)
4. Enter valid email + password → should navigate to Feed tab
5. Tap "Me" tab → should see user email + Sign Out button
6. Tap Sign Out → should return to SignIn screen

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Module not found: @react-navigation/*` | Run `npm install` from repo root |
| TypeScript errors in navigation types | Ensure `@react-navigation/native` is installed |
| Session not restoring on reload | Check `.env` has valid Supabase credentials |
| SecureStore errors on web | Expected — falls back to in-memory adapter |
| Metro bundler errors | Try `npx expo start -c` (clear cache) |

## Architecture notes

- `AuthProvider` wraps the entire app and provides `session`, `loading`, `signOut` via context
- `RootNavigator` reads auth state and conditionally renders `AuthStack` or `AppTabs`
- Auth state changes from Supabase trigger re-renders through the provider, automatically switching stacks
- Shared helpers (`getInitialSession`, `subscribeToAuthChanges`, `signOutSafe`) from `@tae/shared` handle the Supabase auth lifecycle
- Platform-specific `storageAdapter` (SecureStore) remains in `apps/mobile/src/lib/storageAdapter.ts`
