# P-03 — Editable Profile Fields on /app/me (Current Work / Qualifications / Experience)

## Goal
Allow the logged-in user to edit three new optional profile fields on **/app/me**:
- `current_work` (text, nullable)
- `qualifications` (text, nullable)
- `experience` (text, nullable)

This ticket adds UI + save behavior ONLY. No redesign.

## Scope
### In scope
- Update `/app/me` to:
  - Read these fields from `profiles`
  - Show three textareas in edit mode
  - Persist changes via the existing `profiles.update(...)` save flow
  - Ensure Cancel restores original values
- Maintain compatibility with empty values (store as `null` in DB where appropriate)
- Ensure dark mode + mobile layouts remain readable (add minimal `dark:` classes only if needed)

### Out of scope (must NOT change)
- Any database/schema work (P-01 is separate)
- RLS policies, auth logic, routing, middleware
- Post feed logic, skills logic, pagination, attachments, reactions, comments
- Avatar upload logic
- UI redesign / layout restructuring
- Any new tables or normalized job history structure (future ticket only)

## Files to change
- `src/app/app/me/page.tsx`
- `docs/tickets-p-03-me-edit-profile-fields.md`

## Assumptions / Preconditions
- P-01 has been applied in Supabase:
  - columns exist on `profiles`: `current_work`, `qualifications`, `experience`
- Existing RLS already allows user to update their own profile row.
- `/app/me` already has an edit-mode + save flow.

## Acceptance Criteria
- In **Edit mode** on `/app/me`, user can edit:
  - Current Work
  - Qualifications
  - Experience
- On Save:
  - Values persist to Supabase `profiles`
  - Empty/whitespace-only values are saved as `null`
- On Cancel:
  - The edit state resets to the previously saved profile values
- No regressions:
  - Skills, posts list, create-post block, profile completeness, etc. still function
- Works in:
  - Light mode
  - Dark mode (readable text + borders)
  - Mobile widths (no horizontal overflow)

## Implementation Notes (Safety Rules)
- Keep the diff minimal.
- Reuse existing input classes (do not introduce a new component library).
- Only add `dark:` variants when the current style breaks readability.
- Do NOT modify the shape of existing profile updates except adding these 3 fields.
- Prefer:
  - `draft.current_work.trim() || null` (same for other two)
  - so DB stays clean and backwards compatible.

---

## Implementation Log
> Completed 2026-02-23.

### Summary
- Added 3 fields (`current_work`, `qualifications`, `experience`) to `Profile` interface
- Added 3 fields to profile `.select()` query
- Added 3 `useState` hooks initialized from fetched profile
- Added "Work & Experience" edit card with 3 `<textarea>` fields (rows=3, resize-y)
- Added "Work & Experience" view card (only rendered when at least one field is non-null, with `whitespace-pre-line`)
- Included 3 fields in `profiles.update(...)` payload (empty/whitespace → `null`)
- Cancel resets all 3 fields to `profile?.current_work || ""` etc.
- Updated `updatedProfile` object after save to keep local state in sync

### Code Changes
- File: `src/app/app/me/page.tsx`
  - `Profile` interface: added `current_work`, `qualifications`, `experience` (all `string | null`)
  - `.select()`: added the 3 columns
  - Form state: 3 new `useState<string>("")` hooks
  - Fetch init: set form state from profile data
  - `handleCancel`: reset 3 fields
  - `handleSave` → `updates` object: added `current_work: currentWork.trim() || null` (same pattern for other two)
  - `updatedProfile`: included the 3 new fields
  - Edit mode JSX: new "Work & Experience" card with 3 labeled textareas (same input classes as existing fields)
  - View mode JSX: new "Work & Experience" card shown conditionally when any field is populated

## Testing
### Automated
Run:
- `npx tsc --noEmit`
- `npm run build`

Expected: zero TypeScript errors, build completes.

### Manual verification checklist
1. Open `/app/me`
2. Click **Edit**
3. Enter text into:
   - Current Work
   - Qualifications
   - Experience
4. Click **Save**
5. Refresh page → values remain
6. Click **Edit** again → fields pre-filled correctly
7. Clear a field completely → Save → refresh → field remains hidden/empty and DB value is null
8. Toggle Dark Mode → confirm textareas/labels readable
9. Mobile width (DevTools) → no horizontal scroll, textareas fit container

## Rollback plan
- Revert commit for this branch (single-file change expected).
- No DB rollback needed (columns are additive and nullable).