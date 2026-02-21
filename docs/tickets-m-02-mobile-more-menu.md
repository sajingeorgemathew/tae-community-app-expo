# M-02 — Mobile More Menu (Theme + Logout)

## Goal
Add a mobile-only "More" menu in the bottom nav that includes:
- Theme toggle (Light/Dark)
- Logout button

## Scope
- Modify src/components/MobileBottomNav.tsx only

## Non-goals
- No Supabase logic changes
- No auth changes
- No desktop changes
- No new dependencies

## Acceptance
- Mobile: More menu opens
- Theme toggle works
- Logout works
- Desktop unaffected
- npx tsc --noEmit passes
- npm run build passes

## Implementation Summary

### Changes
- **File modified:** `src/components/MobileBottomNav.tsx` (only file touched)

### What was added
1. **"More" button** — a 6th tab in the bottom nav with a horizontal dots icon
2. **Floating popup panel** — appears above the More button when tapped, with:
   - **Theme toggle** — switches between light/dark using `useTheme` from `next-themes`; shows sun icon in dark mode, moon icon in light mode
   - **Logout button** — calls `supabase.auth.signOut()` then redirects to `/login`
3. **Click-outside dismiss** — `mousedown` listener closes the panel when tapping outside
4. **Hydration safety** — `mounted` state prevents SSR/client mismatch for theme icon/label

### Design details
- Panel: `z-[60]`, rounded-xl, white/dark-slate-900 bg, border, shadow
- Mobile-only: entire nav is `md:hidden` (unchanged)
- Logout text styled red for visual distinction
- No new dependencies added; reuses `next-themes` and `supabaseClient`

### Verification
- `npx tsc --noEmit` — passed
- `npm run build` — passed