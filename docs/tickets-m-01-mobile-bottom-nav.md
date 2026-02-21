# M-01 — Mobile Bottom Navigation

## Goal
Add a fixed bottom navigation bar for mobile to prevent users from getting “stuck” after login. Desktop layout must remain unchanged.

## Scope (must stay safe)
- Mobile-only bottom nav (`md:hidden`)
- Desktop sidebar unchanged
- Add bottom padding to main content on mobile (`pb-20 md:pb-0` or equivalent)
- No changes to Supabase, auth, routes, polling, or business logic

## Tabs
- Home: /app
- Feed: /app/feed
- Directory: /app/directory
- Messages: /app/messages
- Profile: /app/me
(Optional later: Admin only for admins)

## Acceptance checks
- Desktop: identical layout and spacing as before
- Mobile: bottom nav visible on all /app/* pages
- No content hidden behind the nav (verify scroll bottom)
- Active tab highlighting works
- Build passes:
  - npx tsc --noEmit
  - npm run build

---

## Implementation Log

### Status: Implemented

### Files Changed

**New:**
- `src/components/MobileBottomNav.tsx` — Client component rendering a fixed-bottom nav with 5 tabs. Uses `usePathname` for active state and `useAppMetrics` for unread messages badge. Hidden on `md:` and above via `md:hidden`.

**Modified:**
- `src/app/app/layout.tsx` — Imported `<MobileBottomNav />` into the app shell. Added `pb-20 md:pb-0` to `<main>` to prevent content overlap on mobile.

### Implementation Details
- **Visibility**: `md:hidden` — only shows below 768px breakpoint.
- **Active state**: Exact match for `/app` and `/app/me`; prefix match for `/app/feed`, `/app/directory`, `/app/messages`.
- **Badge**: Unread messages count on Messages tab via `useAppMetrics`.
- **Dark mode**: Full dark mode support with `dark:` variants.
- **Z-index**: `z-50` keeps nav above page content.
- **No new dependencies** added.
- **Desktop sidebar**: Untouched.

### Build Verification
- `npx tsc --noEmit` — Passed
- `npm run build` — Passed

### Manual Testing Steps
1. Open app on mobile viewport (< 768px) or browser DevTools responsive mode.
2. Verify bottom nav appears with 5 tabs: Home, Feed, Directory, Messages, Profile.
3. Tap each tab — confirm navigation works and active tab highlights.
4. Scroll to bottom of page content — confirm nothing is hidden behind the nav.
5. Resize to desktop (>= 768px) — confirm bottom nav disappears.
6. Confirm desktop sidebar works unchanged.
7. Toggle dark mode — verify bottom nav colors update.
8. If unread messages exist, verify red badge on Messages tab.