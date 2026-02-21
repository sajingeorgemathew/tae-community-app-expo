# DM-05 — Feed Dark Mode Polish

## Goal
Improve dark mode readability on /app/feed only (no PostCard changes).

## Scope
- src/app/app/feed/page.tsx only
- Add dark: Tailwind classes to header, filters, buttons, empty state, page background

## Non-goals (must not change)
- PostCard.tsx
- Supabase queries / pagination / ranking
- Reactions, comments, deletes, media loading

## Verification
- npx tsc --noEmit
- npm run build
- Manual:
  - Toggle dark mode
  - /app/feed header readable
  - Filter pills readable (active + hover)
  - New Post button readable
  - Empty state readable
  - Posts still render (PostCard unchanged)

---

## Implementation Log

**File changed:** `src/app/app/feed/page.tsx` (dark: classes only, no logic changes)

### 1. Loading state
- Page background: `dark:bg-slate-900`
- Spinner border: `dark:border-slate-200 dark:border-t-transparent`
- Loading text: `dark:text-slate-400`

### 2. Page background
- Main shell: `dark:bg-slate-900`

### 3. Page header
- Header bar: `dark:bg-slate-950 dark:border-slate-800`
- Back arrow: `dark:text-slate-500 dark:hover:text-slate-300`
- Title: `dark:text-slate-100`
- Subtitle: `dark:text-slate-400`

### 4. Filter pills
- Container bar: `dark:bg-slate-950 dark:border-slate-800`
- Active pill: `dark:bg-slate-200 dark:text-slate-900` (inverted for contrast)
- Inactive pill: `dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800/60`
- Focus ring: `focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500`

### 5. "New Post" button (header + empty state)
- `dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300`

### 6. Empty state card
- Surface: `dark:bg-slate-800 dark:border-slate-700`
- Icon: `dark:text-slate-600`
- Primary text: `dark:text-slate-300`
- Muted text: `dark:text-slate-500`

### 7. Load More button
- `dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700`

## Verification Checklist
- [x] `npx tsc --noEmit` — passed
- [x] `npm run build` — passed
- [ ] Manual: toggle dark mode, header readable
- [ ] Manual: filter pills readable (active + hover)
- [ ] Manual: New Post button readable
- [ ] Manual: empty state readable
- [ ] Manual: posts still render (PostCard unchanged)