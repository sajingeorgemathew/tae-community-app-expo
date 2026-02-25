# P-04 — Profile Completeness includes new profile fields (optional)

## Goal
If the Profile Completeness card exists on /app/me, include these fields as OPTIONAL improvements:
- current_work
- qualifications
- experience

## Safety approach
Use **bonus scoring** so existing users do NOT lose completeness.
- Base completeness remains unchanged
- These fields only increase completeness if filled

## In scope
- Add the 3 fields into completeness evaluation (recommended/bonus)
- Update missing-items list (if it exists) to optionally mention these fields

## Out of scope
- No DB changes (P-01 already handled)
- No redesign of card UI
- No change to profile save logic (P-03 handled)
- No changes to other pages

## Files
- src/app/app/me/page.tsx (or wherever completeness is computed/rendered)
- docs/tickets-p-04-profile-completeness-fields.md

## Acceptance Criteria
- Completeness percent does not drop for existing users who haven’t filled the new fields
- If user fills any of the 3 fields, completeness improves
- Dark mode + mobile remain readable (only add minimal dark: classes if required)
- No TypeScript errors, build passes

## Testing
### Automated
- npx tsc --noEmit
- npm run build

### Manual
1) Go to /app/me with old profile → completeness should look the same as before
2) Fill Current Work / Qualifications / Experience → completeness increases
3) Refresh → completeness remains increased

## Rollback
Revert commit. No DB rollback required.

---

## Implementation Notes

### What changed
**File:** `src/app/app/me/page.tsx`

1. **`MissingItem` interface** — Added `"current_work" | "qualifications" | "experience"` to the `key` union; added optional `recommended` boolean.
2. **`computeCompleteness()`** — Base scoring (4 fields × 25% = 100%) is unchanged. Added 3 bonus fields worth 5% each (capped at 100% total). Users who haven't filled these fields see no drop in score.
3. **Missing-items list** — Bonus fields appear with a green dot and "(Recommended)" label to distinguish them from required items.
4. **`handleAddField()`** — New cases for `current_work`, `qualifications`, `experience` that enter edit mode and focus the relevant textarea.

### Verification commands run
```
npx tsc --noEmit   # ✅ pass
npm run build       # ✅ pass
```