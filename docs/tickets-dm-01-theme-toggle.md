# DM-01 — Theme system + Toggle (no UI redesign yet)

## Goal
Enable dark mode technically with a manual toggle near Logout in the sidebar.
No page redesign in this ticket.

## Scope
- Install `next-themes`
- Add ThemeProvider with `attribute="class"`
- Add toggle UI (Light/Dark) in AppSidebar near Logout
- Add no-flash/hydration guard (`suppressHydrationWarning` on `<html>` or next-themes recommended approach)

## Non-goals (do not change)
- No layout redesign
- No Supabase changes
- No logic changes to data fetching / polling / routing
- Only styling changes required for toggle placement

## Acceptance checks
- Toggle switches Light/Dark and persists after refresh
- Toggle sits near Logout in sidebar
- No runtime errors or hydration warnings

---

## Implementation Log

### Files changed
1. **`src/components/ThemeProvider.tsx`** (new) — Client component wrapping `next-themes` ThemeProvider with `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`.
2. **`src/app/layout.tsx`** — Added `suppressHydrationWarning` to `<html>`, wrapped children with `<ThemeProvider>`.
3. **`src/app/globals.css`** — Added `@variant dark (&:where(.dark, .dark *));` for Tailwind v4 class-based dark mode.
4. **`src/components/AppSidebar.tsx`** — Added theme toggle button (sun/moon icon + label) above Logout. Added `dark:` utility classes to sidebar nav, logout, and toggle for dark mode styling.

### Implementation steps
1. Created `ThemeProvider.tsx` as a `"use client"` wrapper around `next-themes`.
2. Integrated provider in root layout (`layout.tsx`) with `suppressHydrationWarning` on `<html>` to prevent flash.
3. Added Tailwind v4 dark variant directive in `globals.css` so `dark:` utilities work via class strategy.
4. Added `useTheme()` hook in `AppSidebar` with a `mounted` guard to avoid hydration mismatch.
5. Toggle button placed directly above Logout with icon (sun for light, moon for dark) + text label.
6. Added `dark:` classes to sidebar nav wrapper and buttons for dark mode appearance.

### Testing steps
1. `npx tsc --noEmit` — passes with no errors.
2. `npm run build` — compiles and generates all pages successfully.
3. **Manual verification:**
   - Load app in browser, confirm sidebar shows "Light" with moon icon by default.
   - Click toggle — page switches to dark mode, button shows "Dark" with sun icon.
   - Refresh page — theme persists (stored in `localStorage` by `next-themes`).
   - No hydration warnings in browser console.
   - Logout button and nav links remain functional and correctly styled in both themes.