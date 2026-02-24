# P-02 — Read-only profile sections on /app/profile/[id]

## Goal
Display (read-only) sections on other users’ profiles if populated:
- Current Work
- Qualifications
- Experience

## Scope
- Only `src/app/app/profile/[id]/page.tsx`
- Add fields to Supabase select query
- Add UI cards (responsive + dark/light)
- No edit/write logic

## UX rules
- If value empty/null -> section is hidden (no "Not provided" copy)

## Verification
- [x] `npx tsc --noEmit` passes
- [x] `npm run build` passes
- [ ] Profile with values shows sections
- [ ] Profile without values does not show sections
- [ ] Looks good in light + dark + mobile widths

## Implementation Notes

### Changes (single file: `src/app/app/profile/[id]/page.tsx`)
1. **Profile interface** — added `current_work`, `qualifications`, `experience` (all `string | null`)
2. **Supabase select** — appended the three columns to the existing `.select()` call
3. **Section cards** — rendered up to 3 cards (Current Work, Qualifications, Experience) between the About card and the Posts section. Each card:
   - Only renders when the field has a non-empty trimmed value (`.filter(s => s.body?.trim())`)
   - Uses the same card styling as existing cards (rounded-xl, border, bg-white/dark:bg-slate-800)
   - Includes the blue accent bar heading consistent with About/Posts headers
   - Body text uses `whitespace-pre-line break-words` for multi-line content without overflow
   - Fully responsive — stacks naturally in the single-column mobile layout

### What was NOT changed
- No RLS, schema, or migration changes
- No edit/update logic
- No changes to `/app/me`
- No refactors of existing code