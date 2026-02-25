# P-04.1 — Profile Completeness includes Current Work / Qualifications / Experience

## Goal
Update the profile completeness scoring + “missing fields” nudge so it also considers:
- current_work
- qualifications
- experience

## Why
Right now completeness hits 100% based only on older fields (name, program, grad_year, headline, skills) even when the new sections are empty.

## Safety constraints
- No schema changes
- No changes to RLS, routes, or auth
- Do not change editing flows (P-03 already handles saving)
- Only update completeness calculation + displayed missing items text

## Acceptance criteria
- Completeness % decreases when any of the new fields are empty
- “Missing items” list includes these new fields when empty
- Light/dark mode stays readable
- No change to profile save behavior
- TypeScript + build pass

## Test plan
- Use your own /app/me and fill some but not all fields
- Verify % and missing list updates correctly
- Verify 100% only when all required fields are filled
- Verify no crashes when values are null

## Implementation log

### Changes made
**File:** `src/app/app/me/page.tsx`

1. **`computeCompleteness` function (lines 38–50):** Replaced the old two-tier scoring (4 base fields at 25% each + 3 bonus fields at 5% each) with a single equal-weight system across all 7 fields. Each field now contributes `Math.round(filled / 7 * 100)` percent. Empty strings, whitespace-only, and null values are all treated as missing.

2. **`MissingItem` interface (line 32–35):** Removed the `recommended?: boolean` property since all fields are now required.

3. **Completeness card UI (line ~810):** Removed the `recommended` conditional styling (green vs amber dot) and the "(Recommended)" label. All missing items now display uniformly with an amber dot.

No changes to save logic, editing flows, handlers, routes, or schema.

### Verification
- `npx tsc --noEmit` — passed, no errors
- `npm run build` — passed, all pages compiled successfully

### Manual verification steps
1. Navigate to `/app/me` while logged in
2. Clear all three new fields (current_work, qualifications, experience) → completeness should drop below 100% and missing items list should show the three new fields
3. Fill all 7 fields → completeness should show 100% and the card should disappear
4. Set a new field to whitespace only → should still count as missing
5. Null values (never-set fields) should not cause crashes
6. Verify dark mode readability of the completeness card