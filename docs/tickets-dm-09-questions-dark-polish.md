# DM-09 — Questions List + Detail Dark Mode Polish

## Goal
Make Questions list + detail pages readable in dark mode using styling-only changes (Tailwind `dark:` variants). No query/state logic changes.

## Targets
- src/app/app/questions/page.tsx
- src/app/app/questions/[id]/page.tsx

## Non-goals (do NOT change)
- Supabase queries, sorting, pagination, state logic, polling, routing
- Feature behavior (answered indicator logic, submit behavior, etc.)
- Component structure beyond className additions

## Styling rules
- Light: white + navy (existing)
- Dark: navy + slate
- Must preserve contrast: text, borders, focus rings, badges

## Checklist
- [x] List page: header, search/filter, question cards, answered indicator, chips/badges
- [x] Detail page: question card, answers stack, answer form inputs, buttons, badges
- [x] Empty states readable
- [x] All links/CTA visible on dark background
- [x] No logic changes

## Verification
- [x] `npx tsc --noEmit` — passed, zero errors
- [x] `npm run build` — passed, all routes generated successfully
- [ ] Manual: toggle dark/light, verify list + detail pages readability

## Implementation Log

### Files changed
1. **src/app/app/questions/page.tsx** — Questions list page
2. **src/app/app/questions/[id]/page.tsx** — Question detail page

### Changes applied (styling only — `dark:` class additions)

| Element | Dark mode treatment |
|---|---|
| **Surfaces** (cards, forms, empty states) | `dark:bg-slate-800 dark:border-slate-700` |
| **Loading skeletons** | `dark:bg-slate-700` (primary), `dark:bg-slate-600` (secondary) |
| **Primary text** (headings, titles, labels) | `dark:text-slate-100` or `dark:text-slate-200` |
| **Body text** | `dark:text-slate-300` |
| **Secondary/muted text** | `dark:text-slate-400` / `dark:text-slate-500` |
| **Dot separators** | `dark:text-slate-600` |
| **Reply count (emerald)** | `dark:text-emerald-400` — clear answered indicator |
| **Role badges (tutor/admin)** | `dark:bg-blue-900/40 dark:text-blue-300` |
| **Online presence dots** | `dark:border-slate-800` (matches card bg) |
| **Form inputs** | `dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500` |
| **Focus rings** | `dark:focus:border-slate-400 dark:focus:ring-slate-400/30` |
| **CTA buttons** | `dark:bg-emerald-600 dark:hover:bg-emerald-700` |
| **Back links** | `dark:text-slate-200` |
| **Error states** | `dark:border-red-800 dark:bg-red-900/30 dark:text-red-300` |
| **Empty state icons** | `dark:bg-emerald-900/30 dark:text-emerald-400` |

### What was NOT changed
- Zero Supabase queries modified
- Zero state/logic/routing changes
- No new dependencies added
- No component structure changes — only `className` string additions

## Manual Test Checklist
- [ ] Toggle to dark mode → Questions list page: cards have dark bg, text readable
- [ ] Reply count shows emerald-400 in dark (answered indicator clear)
- [ ] Role badges (tutor/admin) visible with blue-300 text on blue-900 bg
- [ ] Online presence dots blend with card bg (slate-800 border)
- [ ] "Ask a Question" button shows emerald-600 in dark mode
- [ ] Ask form: inputs have dark bg, visible borders, focus ring visible
- [ ] Empty state: icon and text readable on dark bg
- [ ] Error banner: red tones visible on dark bg
- [ ] Navigate to question detail → card, body text, author info all readable
- [ ] Answers list: each answer card has dark bg, text readable
- [ ] Answer form (tutor/admin): textarea dark bg, focus ring visible, button emerald
- [ ] "No answers yet" empty state readable
- [ ] Not-found state readable in dark mode
- [ ] Back links visible and hoverable in both modes
- [ ] Toggle back to light mode → everything unchanged from before
