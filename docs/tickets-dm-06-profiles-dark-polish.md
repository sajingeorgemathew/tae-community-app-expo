# DM-06 — Profiles (Me + Other Profile) dark mode polish

## Goal / Scope

Improve dark mode readability and contrast for both profile pages without changing any logic, queries, or component structure.

## Targets

- `src/app/app/me/page.tsx` (my profile with edit UI)
- `src/app/app/profile/[id]/page.tsx` (other profile view-only)

## Rules

- Styling only (`dark:` classes / CSS vars only)
- Do not change Supabase queries, pagination, routing, edit/view logic
- Do not touch PostCard logic (already improved in DM-03)
- Brand: light = white + navy; dark = navy + slate

## Implementation Log

### Changes applied to both pages

| Element | Light (unchanged) | Dark (added) |
|---|---|---|
| Page background | `bg-gray-50/50` | `dark:bg-slate-900` |
| Page header | `bg-white border-gray-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Header title | `text-gray-900` | `dark:text-white` |
| Header subtitle | `text-gray-500` | `dark:text-slate-400` |
| Back arrow | `text-gray-400` | `dark:text-slate-500 dark:hover:text-slate-300` |
| Profile identity card | `bg-white border-gray-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Profile name | `text-gray-900` | `dark:text-white` |
| Headline text | `text-gray-500` | `dark:text-slate-400` |
| Role badge | `bg-slate-100 text-slate-700` | `dark:bg-slate-700 dark:text-slate-300` |
| Quick info divider | `border-gray-100` | `dark:border-slate-700` |
| Quick info text | `text-gray-600` | `dark:text-slate-300` |
| Quick info icons | `text-gray-400` | `dark:text-slate-500` |
| Skills card container | `bg-white border-gray-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Skills heading | `text-gray-900` | `dark:text-white` |
| Skill chips | `bg-blue-50 text-blue-700` | `dark:bg-blue-900/30 dark:text-blue-300` |
| Info cards (Basic, About) | `bg-white border-gray-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Card headings | `text-gray-900` | `dark:text-white` |
| Heading accent bars (slate) | `bg-slate-800` | `dark:bg-slate-400` |
| Label text (uppercase) | `text-gray-400` | `dark:text-slate-500` |
| Value text | `text-gray-900` | `dark:text-white` |
| About body | `text-gray-600` | `dark:text-slate-300` |
| Posts heading | `text-gray-900` | `dark:text-white` |
| Posts count | `text-gray-400` | `dark:text-slate-500` |
| Create Post link | `text-slate-700` | `dark:text-slate-300 dark:hover:text-white` |
| Empty state icon | `text-gray-200` | `dark:text-slate-600` |
| Empty state text | `text-gray-500` | `dark:text-slate-400` |
| Empty state subtext | `text-gray-400` | `dark:text-slate-500` |
| Load more button | `bg-white border-gray-200 text-gray-700` | `dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200` |
| Loading spinner text | `text-gray-500` | `dark:text-slate-400` |

### Additional changes for /me page only

| Element | Light (unchanged) | Dark (added) |
|---|---|---|
| Cancel button | `bg-white border-gray-200 text-gray-700` | `dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200` |
| Success banner | `bg-green-50 text-green-800 border-green-200` | `dark:bg-green-900/30 dark:text-green-300 dark:border-green-800` |
| Error banner | `bg-red-50 text-red-800 border-red-200` | `dark:bg-red-900/30 dark:text-red-300 dark:border-red-800` |
| Avatar hint text | `text-gray-400` | `dark:text-slate-500` |
| No headline italic | `text-gray-400` | `dark:text-slate-500` |
| Completeness card | `bg-white border-gray-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Completeness heading | `text-gray-900` | `dark:text-white` |
| Completeness percent | `text-blue-600` | `dark:text-blue-400` |
| Progress bar track | `bg-gray-100` | `dark:bg-slate-700` |
| Completeness item text | `text-gray-600` | `dark:text-slate-300` |
| Add button (completeness) | `text-blue-600` | `dark:text-blue-400 dark:hover:text-blue-300` |
| Form labels | `text-gray-700` | `dark:text-slate-300` |
| Form inputs | `border-gray-200 bg-white` | `dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400` |
| Skills count | `text-gray-400` | `dark:text-slate-500` |
| Edit skill chips | `bg-blue-50 text-blue-700` | `dark:bg-blue-900/30 dark:text-blue-300` |
| Skill remove button | `hover:bg-blue-100` | `dark:hover:bg-blue-800/40 dark:hover:text-red-400` |
| Add skill button | `bg-white border-gray-200 text-gray-700` | `dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200` |
| Headline char count | `text-gray-400` | `dark:text-slate-500` |

### Additional changes for /profile/[id] page only

| Element | Light (unchanged) | Dark (added) |
|---|---|---|
| Not-found page bg | `bg-gray-50/50` | `dark:bg-slate-900` |
| Not-found header | `bg-white border-gray-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Not-found avatar circle | `bg-gray-100` | `dark:bg-slate-800` |
| Not-found avatar icon | `text-gray-300` | `dark:text-slate-600` |
| Not-found text | `text-gray-500` | `dark:text-slate-400` |
| Browse directory link | `text-blue-600` | `dark:text-blue-400` |

## Manual Verification Steps

1. Run `npx tsc --noEmit` — expect zero errors
2. Run `npm run build` — expect clean build
3. Start dev server (`npm run dev`)
4. Toggle dark mode via sidebar toggle
5. Visit `/app/me`:
   - Left panel: dark bg, white text, visible borders
   - Role badge: readable contrast
   - Skills chips: blue on dark surface
   - Completeness card: progress bar visible, text readable
   - Click "Edit Profile": form inputs dark bg, white text, visible borders
   - Skill chips in edit mode: readable with remove buttons
   - Cancel/Save buttons: proper contrast
   - Success/error banners: colored bg with readable text
6. Visit `/app/profile/[id]`:
   - Left panel: same dark treatment as /me
   - Basic Info card: labels/values readable
   - About card: text visible
   - Posts section heading: visible
   - Empty state: icon/text visible
   - Message button: already slate-800, remains functional
7. Toggle back to light mode — confirm no regressions

## Acceptance Criteria

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Both pages readable in dark mode
- [ ] Light mode unchanged
- [ ] No logic/query/routing changes
