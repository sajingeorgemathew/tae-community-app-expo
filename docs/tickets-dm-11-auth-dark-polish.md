# DM-11 — Auth (Login/Signup) Dark Mode Polish

## Goal
Auth pages look correct in dark mode after toggle persists and user logs out.

## Scope (safe)
- Styling-only: Tailwind dark: classes and/or CSS vars
- No auth logic changes, no routing changes, no Supabase changes

## Files Changed
| File | What changed |
|------|-------------|
| `src/app/login/page.tsx` | Added `dark:` variants to all UI elements |
| `src/app/signup/page.tsx` | Added `dark:` variants to all UI elements |

## Implementation Log

### Elements updated (both pages)
| Element | Light (unchanged) | Dark (added) |
|---------|-------------------|-------------|
| Page `<main>` bg | `from-slate-50 to-slate-100` | `dark:from-slate-900 dark:to-slate-950` |
| Card bg | `bg-white` | `dark:bg-slate-800` |
| Card shadow | `shadow-md` | `dark:shadow-lg dark:shadow-black/30` |
| Card border | `border-[#1e293b]` | `dark:border-slate-500` |
| Heading `<h1>` | `text-[#1e293b]` | `dark:text-slate-100` |
| Labels | inherits default | `dark:text-slate-200` |
| Inputs | default border | `dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400` |
| Input focus ring | `focus:ring-[#1e293b]` | `dark:focus:border-slate-400 dark:focus:ring-slate-400` |
| Error text | `text-red-600` | `dark:text-red-400` |
| Submit button | `bg-[#1e293b]` | `dark:bg-slate-600 dark:hover:bg-slate-500` |
| Footer text | inherits default | `dark:text-slate-300` |
| Footer link | `text-[#1e293b]` | `dark:text-slate-100` |

### What was NOT changed
- No `onSubmit` handlers modified
- No Supabase auth calls modified
- No `useState` / `useRouter` logic modified
- No new files created
- No dependencies added

## Verification Checklist
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Login page: light mode renders unchanged
- [ ] Login page: dark mode — bg, card, inputs, button, links all readable
- [ ] Signup page: light mode renders unchanged
- [ ] Signup page: dark mode — bg, card, inputs, button, links all readable
- [ ] Toggle dark → logout → login page shows dark correctly
- [ ] Toggle light → verify no regressions
