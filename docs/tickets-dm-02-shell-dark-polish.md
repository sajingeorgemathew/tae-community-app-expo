# DM-02 — Shell Dark Mode Polish

## Goal
Make dark mode readable and consistent in the shared app shell (sidebar + global layout surfaces) without changing any app logic.

## Non-goals (must not change)
- No Supabase query/polling changes
- No routing changes
- No business logic changes
- No page redesign (page-level fixes come later tickets)

## Files expected to touch
- src/components/AppSidebar.tsx
- src/app/app/layout.tsx (if used for shell wrapper)
- src/app/layout.tsx (root)
- src/app/globals.css (only if needed for base background/text)

## Manual verification
1. Toggle Dark/Light from sidebar.
2. Refresh page: theme persists.
3. Visit: /app, /app/feed, /app/me, /app/messages, /app/questions
4. Confirm: sidebar title, labels, active state, hover state are readable in dark mode.
5. Confirm: main background isn’t bright white in dark mode; text is readable.

## Commands
- npx tsc --noEmit
- npm run build

## Implementation log

### Files changed

#### 1. `src/components/AppSidebar.tsx`
- **Nav container**: `dark:bg-gray-900 dark:border-gray-700` → `dark:bg-slate-950 dark:border-slate-800`; `border-gray-200` → `border-slate-200`
- **Title text**: Added `dark:text-slate-100` to "TAE Community" span
- **Dividers** (top and bottom): `border-gray-100` → `border-slate-200 dark:border-slate-800`
- **Nav links (inactive)**: `text-gray-600 hover:bg-gray-100 hover:text-gray-900` → `text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100`
- **Nav links (active)**: Added `dark:bg-slate-700` (keeps white text)
- **Nav links (focus)**: Added `focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500`
- **Admin link (inactive)**: Added `dark:text-red-400 dark:hover:bg-slate-800`
- **Admin link (active)**: Added `dark:bg-slate-700`
- **User name**: Added `dark:text-slate-100`
- **User role**: `text-gray-500` → `text-slate-500 dark:text-slate-400`
- **Theme toggle button**: Migrated from gray → slate palette with dark variants
- **Logout button**: Migrated from gray → slate palette; added focus ring

#### 2. `src/app/app/layout.tsx`
- Shell wrapper: Added `dark:bg-slate-950 dark:text-slate-100` to the `.app-shell` div

#### 3. `src/app/globals.css`
- Added `.dark` selector: sets `--background: #020617` (slate-950) and `--foreground: #f1f5f9` (slate-100)
- Added `:where(.dark) .app-shell` block: overrides all CSS custom properties (brand colors, card bg, border, shadow, background gradient) for dark mode

#### 4. `src/app/layout.tsx`
- No changes needed (already has `suppressHydrationWarning` and ThemeProvider from DM-01)

### Verification results
- `npx tsc --noEmit` — passed (no output)
- `npm run build` — passed (compiled successfully, all 15 static pages generated)

### Safety summary
All changes are **styling-only** (Tailwind dark: classes and CSS custom property overrides). No Supabase queries, routing, business logic, or component structure was modified. The changes are purely additive `dark:` variants that only activate when the `dark` class is present on `<html>`.