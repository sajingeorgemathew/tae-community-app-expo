# UX-ADMIN-01 — Tutor Course Dropdown: scroll + not clipped

## Problem
Course dropdown gets clipped when opened near bottom of Tutors table because parent containers use overflow/scroll.
Selecting from a long course list is hard.

## Goal
- Dropdown is always visible (not clipped)
- Dropdown is scrollable inside
- No changes to tutor assignment logic or Supabase calls

## Scope
- src/app/app/admin/page.tsx
- (optional) new small shared component/helper for portal dropdown if needed

## Non-goals
- No styling redesign of Admin
- No changes to DB / RLS / queries / state logic for assignments

## Implementation Notes

### What changed
Only UI rendering of the course dropdown in `src/app/app/admin/page.tsx`. No business logic, Supabase queries, state handlers, or permission logic was modified.

### Changes made

1. **Added imports**: `useCallback` from React, `createPortal` from `react-dom`.

2. **New `CourseDropdownTrigger` component**: Wraps the dropdown button and owns the `buttonRef`. Passes the ref to `CourseDropdown` as `anchorRef` so the portal can position itself relative to the button.

3. **Refactored `CourseDropdown` to use a portal**:
   - Renders via `createPortal(…, document.body)` so it escapes any `overflow: hidden/scroll` ancestors.
   - Uses `position: fixed` with coordinates from `getBoundingClientRect()` of the anchor button.
   - **Flip behavior**: If there isn't enough space below the button, the dropdown renders above it instead.
   - **Scroll tracking**: Listens to `scroll` (capture phase) and `resize` events to reposition dynamically.
   - **Max height increased**: `max-h-72` (288px, up from 192px) with `overflow-y-auto` for scrollable content.
   - **z-index**: `9999` to ensure it renders above all other content.
   - **Click outside**: Still works — checks both the dropdown ref and anchor button ref before closing.

4. **Existing state/handlers preserved**: `courseDropdownOpen`, `handleCourseToggle`, `handleCourseSave` — all untouched.

### Files modified
- `src/app/app/admin/page.tsx` — UI-only changes to dropdown rendering/positioning

### What was NOT changed
- No Supabase queries, writes, upserts, or deletes
- No role/permission logic
- No state management logic for course assignments
- No other components or pages

## Verification

### Automated
- `npx tsc --noEmit` — PASS
- `npm run build` — PASS

### Manual verification steps
1. Open Admin page, navigate to Tutors section
2. Set a user's role to "tutor" if needed
3. Click "Select courses..." on a tutor near the **bottom** of the table
   - Dropdown should appear **above** the button (flip behavior) and be fully visible
4. Click "Select courses..." on a tutor near the **top** of the table
   - Dropdown should appear **below** the button
5. Scroll inside the dropdown — should scroll smoothly with many courses
6. Select/deselect multiple courses — checkboxes work correctly
7. Click "Save Courses" — assignment persists (no logic change)
8. Click outside the dropdown — it closes
9. Scroll the page while dropdown is open — dropdown follows the button position
10. Resize the browser window while dropdown is open — dropdown repositions correctly
