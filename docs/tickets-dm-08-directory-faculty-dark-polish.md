# DM-08 — Directory + Faculty Dark Mode Polish

## Goal
Make Directory + Faculty pages readable and polished in dark mode without changing any data logic, routes, click behaviors, or feature behavior.

## Targets
- src/app/app/directory/page.tsx
- src/app/app/faculty/page.tsx

## Rules (Safety)
- Styling-only changes: add Tailwind `dark:` classes + minor CSS var usage if needed.
- Do NOT touch Supabase queries, filters, pagination, navigation links, message buttons, profile routing, presence logic, or any state logic.
- Preserve all existing click targets and accessibility (no removing buttons/links).
- Presence dot must remain visible in dark mode (ring/border treatment).

## Acceptance Criteria
- Cards/surfaces readable in dark mode: backgrounds, borders, headings, subtext.
- Search inputs and filter pills readable (label, placeholder, focus ring).
- Presence dot visible (add ring or outline in dark).
- “Message” / action buttons readable and consistent in dark mode.
- Empty states readable.
- Build passes:
  - npx tsc --noEmit
  - npm run build

## Implementation Log

### Files Changed
1. **src/app/app/directory/page.tsx** — dark mode styling only
2. **src/app/app/faculty/page.tsx** — dark mode styling only

### What Changed (directory/page.tsx)
- **Role badge styles (ROLE_STYLES)**: added `dark:bg-*/40 dark:text-*-300 dark:border-*-700` for admin, tutor, member + fallback
- **Loading skeleton**: `dark:bg-slate-900` page bg, `dark:bg-slate-700/800` skeleton elements, `dark:border-slate-700` card borders
- **Suspense fallback**: `dark:bg-slate-900`
- **Header**: `dark:text-white` on h1, `dark:text-slate-400` on subtitle
- **Search input**: `dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400/20`; clear button `dark:hover:text-slate-300`
- **Empty state**: `dark:bg-slate-800 dark:border-slate-700`, icon circle `dark:bg-slate-700`, text `dark:text-slate-200/500`, clear link `dark:text-slate-300`
- **Cards**: `dark:bg-slate-800 dark:border-slate-700 dark:shadow-slate-900/50`
- **Presence dot**: `dark:border-slate-800 ring-1 ring-emerald-400/50` for visibility
- **Card text**: name `dark:text-white`, headline `dark:text-slate-300`, italic placeholder `dark:text-slate-500`
- **Skills chips**: `dark:text-slate-300 dark:bg-slate-700`
- **CTA row**: border `dark:border-slate-700`, View Profile `dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700`, Message `dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300`
- **Results count**: `dark:text-slate-500`, highlighted spans `dark:text-slate-300`

### What Changed (faculty/page.tsx)
- **Loading skeleton**: same dark pattern as directory
- **Suspense fallback**: `dark:bg-slate-900`
- **Header**: `dark:text-white` on h1, `dark:text-slate-400` on subtitle
- **Search input**: same dark pattern as directory
- **Course select**: `dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:focus:border-slate-400 dark:focus:ring-slate-400/20`
- **Empty states** (no tutors + no filter results): `dark:bg-slate-800 dark:border-slate-700`, icon circles with dark bg, text with dark variants
- **Cards**: `dark:bg-slate-800 dark:border-slate-700 dark:shadow-slate-900/50 dark:hover:border-emerald-700`
- **Tutor badge**: `dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700`
- **Presence dot**: `dark:border-slate-800 ring-1 ring-emerald-400/50`
- **Name**: `dark:text-white`, hover `dark:group-hover:text-emerald-400`
- **Headline**: `dark:text-slate-400`, italic placeholder `dark:text-slate-500`
- **Skills chips**: `dark:text-slate-300 dark:bg-slate-700`
- **Course chips**: `dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-700`
- **CTA row**: same dark pattern as directory (View Profile + Message buttons)
- **Results count**: `dark:text-slate-500`, highlighted spans `dark:text-slate-300`

### What Was NOT Changed
- No Supabase queries, state logic, routing, filters, click handlers, or presence logic modified
- No DOM structure or layout changes
- No new dependencies or imports
- Avatar.tsx already had dark mode classes — no changes needed

## Verification

### Build Results
```
npx tsc --noEmit  → ✅ Pass (no errors)
npm run build     → ✅ Pass (compiled successfully, all routes generated)
```

## Manual Testing Checklist
- [ ] /app/directory in dark mode: page bg is dark slate, cards readable
- [ ] /app/directory: search input visible (dark bg, light text, focus ring)
- [ ] /app/directory: role badges (admin/tutor/member) readable in dark
- [ ] /app/directory: presence dot visible with ring in dark mode
- [ ] /app/directory: skills chips readable (dark bg, light text)
- [ ] /app/directory: "View Profile" button visible (outline, light text)
- [ ] /app/directory: "Message" button inverted (light bg, dark text) in dark mode
- [ ] /app/directory: empty state readable (dark card, readable text)
- [ ] /app/directory: click profile link → navigates correctly
- [ ] /app/directory: click message → starts conversation correctly
- [ ] /app/faculty in dark mode: page bg is dark slate, cards readable
- [ ] /app/faculty: search input + course dropdown visible in dark
- [ ] /app/faculty: tutor badge readable (emerald dark variant)
- [ ] /app/faculty: presence dot visible with ring in dark mode
- [ ] /app/faculty: skills + course chips readable in dark
- [ ] /app/faculty: "View Profile" and "Message" buttons styled correctly
- [ ] /app/faculty: empty states readable (no tutors + no filter results)
- [ ] /app/faculty: name hover turns emerald-400 in dark mode
- [ ] /app/faculty: click profile link → navigates correctly
- [ ] /app/faculty: click message → starts conversation correctly
- [ ] Both pages: no console errors in dark mode
- [ ] Both pages: light mode unchanged / no regressions
- [ ] Both pages: loading skeletons render correctly in dark mode