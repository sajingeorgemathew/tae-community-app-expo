# DM-03 — Shared Components Dark Mode Pass

## Scope

Styling-only changes: Tailwind `dark:` variants added to shared components and page-level UI elements. No business logic, Supabase calls, routing, polling, state machines, or component behavior was modified.

## What Changed

### `src/components/PostCard.tsx`
- Card shell: `dark:bg-slate-950 dark:border-slate-700`
- Author name, content, dates: dark text variants (`dark:text-slate-100`, `dark:text-slate-200`, `dark:text-slate-500`)
- Audience pill: `dark:bg-blue-950 dark:text-blue-300`
- Three-dot menu + dropdown: dark bg/border/hover
- Reaction pills: active (`dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300`) and inactive (`dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400`)
- Comment toggle link: `dark:text-slate-400 dark:hover:text-slate-200`
- Comments section border: `dark:border-slate-800`
- Comment textarea + edit textarea: dark bg/border/text/placeholder/focus-ring
- Post Comment button: `dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200`
- Comment blocks (bg-gray-50): `dark:bg-slate-900`
- Comment author, content, date, edit/delete links: dark text variants
- Cancel button: `dark:bg-slate-700 dark:text-slate-300`
- Loading spinner: `dark:border-slate-600`
- Link attachment: `dark:text-blue-400`

### `src/components/StatCard.tsx`
- Card shell: `dark:bg-slate-950 dark:border-slate-700`
- Label: `dark:text-slate-400`
- Value: `dark:text-slate-100`
- Link label: `dark:text-blue-400`
- Icon: `dark:text-slate-500`

### `src/components/Avatar.tsx`
- Fallback circle: `dark:bg-slate-700`
- Initials text: `dark:text-slate-300`

### `src/app/app/page.tsx` (Dashboard)
- Loading text: `dark:text-slate-500`
- Hero "Create Post" button: `dark:bg-slate-800 dark:text-slate-100`
- Profile completion banner: dark card bg/border, accent stripe, icon, heading, description, missing field items
- Quick search input: dark bg/border/text/placeholder/focus-ring
- Search dropdown: dark bg/border, hover states, result text, role badge, skill pill, "See all" link
- Section headings (Recent Posts, Recent Questions): `dark:text-slate-100`
- View all links: `dark:text-blue-400`
- Empty state cards: dark bg/border/text
- Post preview cards: dark bg/border, author name, date, content text
- Question preview cards: dark bg/border, title, meta text, answer count

### `src/app/app/admin/page.tsx`
- Loading/not-authorized/main backgrounds: `dark:bg-slate-950`
- Not-authorized card: dark bg/border, red icon bg, heading, description
- Admin Dashboard heading: `dark:text-slate-100`
- All 3 section cards (Posts, Tutors, Users): dark bg/border, section header border
- Section headings: `dark:text-slate-100`
- Filter pills (audience + time): inactive state `dark:bg-slate-800 dark:text-slate-300`
- Bulk action bars: `dark:bg-slate-900 dark:border-slate-800`, label text `dark:text-slate-300`
- Selection counts: `dark:text-slate-500`
- Empty state text: `dark:text-slate-500`
- Search inputs (tutor + user): dark bg/border/text/placeholder/focus-ring
- Table containers: `dark:border-slate-700`
- Table headers: `dark:bg-slate-900`, header text `dark:text-slate-400`
- Table bodies: `dark:divide-slate-800`
- Table row hover: `dark:hover:bg-slate-900/50`
- Cell text: `dark:text-slate-400`, name text `dark:text-slate-100`
- Role badges: `dark:bg-slate-800 dark:text-slate-300`
- Status badges: Disabled (`dark:bg-red-950 dark:text-red-300 dark:border-red-800`), Active (`dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800`)
- Course pills: `dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800`
- Select element: `dark:text-slate-300`
- Course dropdown button: dark bg/border/text/hover
- CourseDropdown component: dark bg/border, hover, course text
- Muted dash/italic text: `dark:text-slate-500`/`dark:text-slate-600`
- Back to App links: `dark:text-blue-400`

### `src/app/globals.css`
- `:where(.dark) .app-shell .app-btn-primary:hover` — lighter hover bg (#475569)
- `:where(.dark) .app-shell .app-input:focus` — visible focus ring with slate-toned shadow

## Why Safe

- **Zero logic changes**: Only Tailwind `dark:` class additions. No JS/TS code paths modified.
- **No new dependencies**: Pure CSS-in-class changes.
- **No layout changes**: No spacing, sizing, flexbox, or grid modifications.
- **Additive only**: `dark:` variants are inert in light mode — they only activate under `.dark` ancestor.
- **Build passes**: `npx tsc --noEmit` and `npm run build` both succeed with zero errors.

## Manual Verification Steps

Toggle dark mode via the sidebar theme toggle and verify each page:

1. **Dashboard** (`/app`)
   - [ ] Stat cards readable (label, value, icon visible)
   - [ ] Search input has dark bg, visible text, focus ring visible
   - [ ] Search dropdown dark bg, results readable, hover visible
   - [ ] Profile completion banner readable (if shown)
   - [ ] Recent posts/questions cards readable, hover shadow works
   - [ ] Hero banner buttons visible

2. **Feed** (`/app/feed`)
   - [ ] PostCard bg is dark, text readable
   - [ ] Audience pill readable (blue on dark)
   - [ ] Reaction pills readable in both active/inactive states
   - [ ] Three-dot menu dropdown dark bg, delete option visible
   - [ ] Comments section: input, post button, comment blocks all readable
   - [ ] Edit comment textarea readable, save/cancel buttons visible
   - [ ] Link attachments readable

3. **Profile** (`/app/profile/[id]`)
   - [ ] PostCards rendered correctly in dark mode
   - [ ] Avatar fallback circle visible with initials

4. **Admin** (`/app/admin`)
   - [ ] Section cards (Posts, Tutors, Users) all dark bg with visible borders
   - [ ] Filter pills readable, active state clear
   - [ ] Bulk action bars dark bg, labels readable
   - [ ] Tutor table: headers, cells, role badges, course pills all readable
   - [ ] User table: headers, cells, status badges (Active/Disabled), action buttons visible
   - [ ] Search inputs dark bg with visible text and focus ring
   - [ ] Course dropdown dark bg, hover visible
   - [ ] Not-authorized card (if accessible) readable

5. **Messages / Directory** (`/app/messages`, `/app/directory`)
   - [ ] Avatar components display correctly in dark mode

6. **Light mode regression**
   - [ ] Toggle back to light mode — everything looks the same as before

## Implementation Steps

1. Read all target files and existing CSS variables
2. Searched for shared UI patterns (inputs, pills, tables, buttons) across all pages
3. Added `dark:` Tailwind variants to PostCard, StatCard, Avatar components
4. Added `dark:` variants to dashboard page (search, cards, text)
5. Added `dark:` variants to admin page (tables, filters, pills, dropdowns)
6. Added dark mode focus ring rules to globals.css
7. Ran `npx tsc --noEmit` — passed
8. Ran `npm run build` — passed

## Testing Steps

1. Start dev server: `npm run dev`
2. Navigate to `/app` (dashboard)
3. Toggle dark mode via sidebar toggle
4. Walk through each page in the verification checklist above
5. Toggle back to light mode and verify no regressions
6. Check focus-visible rings on inputs (Tab key) in both modes
