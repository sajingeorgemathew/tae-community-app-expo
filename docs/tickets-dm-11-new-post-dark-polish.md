# DM-11 — New Post Dark Mode Polish

## Goal
Make the "Create New Post" page readable in dark mode.

## Scope
- New post page only (likely src/app/app/feed/new/page.tsx)

## Non-goals
- No changes to upload logic
- No changes to Supabase queries/inserts
- No validation or state changes

## What to fix
- Page background + header title/subtitle
- Main form card background/border
- Labels + helper text ("Markdown supported", max sizes)
- Textarea/input backgrounds, placeholder, focus ring
- Audience pills: active/inactive/hover
- Upload dropzones: dashed border, icon, helper text
- Buttons: primary/secondary contrast in dark
- Error/success states if present

## Implementation Log

### File changed
- `src/app/app/feed/new/page.tsx` — dark mode classes only, no logic changes

### Changes applied
| Element | Dark class additions |
|---|---|
| Loading screen bg | `dark:bg-slate-950`, `dark:text-slate-400` |
| Page background | `dark:bg-slate-950` |
| Back link | `dark:text-slate-300`, `dark:hover:text-slate-100` |
| Page heading | `dark:text-slate-100` |
| Subtitle | `dark:text-slate-400` |
| Error banner | `dark:border-red-800`, `dark:bg-red-950/50`, `dark:text-red-300/400` |
| Card container | `dark:border-slate-700`, `dark:bg-slate-900` |
| Section dividers | `dark:border-slate-700/50` |
| Labels | `dark:text-slate-100` |
| Helper/optional spans | `dark:text-slate-500` |
| Textarea / input | `dark:border-slate-700`, `dark:bg-slate-800`, `dark:text-slate-100`, `dark:placeholder:text-slate-500`, `dark:focus:border-slate-500`, `dark:focus:ring-slate-500` |
| Audience pills (active) | `dark:bg-slate-100`, `dark:text-slate-900` |
| Audience pills (inactive) | `dark:bg-slate-800`, `dark:text-slate-300`, `dark:hover:bg-slate-700` |
| Upload dropzones | `dark:border-slate-600`, `dark:hover:border-slate-400`, `dark:bg-slate-800/50` |
| Dropzone icons/text | `dark:text-slate-500`, `dark:group-hover:text-slate-300/200` |
| File preview cards | `dark:border-slate-700`, `dark:bg-slate-800`, icon thumb `dark:bg-slate-700` |
| File name / size | `dark:text-slate-200`, `dark:text-slate-500` |
| Cancel button | `dark:border-slate-700`, `dark:text-slate-300`, `dark:hover:bg-slate-800` |
| Post button | `dark:bg-slate-100`, `dark:text-slate-900`, `dark:hover:bg-slate-200` |
| Footer note | `dark:text-slate-500` |

### Build results
- `npx tsc --noEmit` — passed (no errors)
- `npm run build` — passed (compiled successfully)

## Verification
- npx tsc --noEmit — PASS
- npm run build — PASS
- Manual:
  - Dark mode: page is readable, all elements have proper contrast
  - Light mode: unchanged look (dark: classes only activate in dark mode)
  - Create post still works (text-only + with image/video) — no logic changed