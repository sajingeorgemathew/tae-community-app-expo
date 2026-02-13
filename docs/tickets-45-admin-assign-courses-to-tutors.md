# Ticket 45 — Admin UI: Assign Courses to Tutors

## Goal
Allow admins to assign/unassign courses to tutors from the Admin → Tutors section.

## Scope
- Add course picker UI (multi-select) for tutor rows in /app/admin Tutors section.
- Read available courses from public.courses (active only).
- Read existing assignments from tutor_course_assignments.
- On save:
  - Insert new assignments for selected courses not yet assigned
  - Delete assignments that were removed
- No faculty filtering yet.

## Data rules
- Only tutors (role='tutor') can have course assignments.
- If role is changed to member, assignments may remain in DB but should not be editable (UI disables). (Optional: delete assignments on demote later.)

## Security
- All writes must go through Supabase anon key + RLS.
- Only admins can insert/delete tutor_course_assignments (enforced by RLS).

## Non-goals
- No changes to /faculty page filtering
- No Q&A changes
- No notifications

## Manual Supabase steps
- Ensure Ticket 44 applied
- Seed courses if empty

## Implementation

### Files changed
- `src/app/app/admin/page.tsx` — Added course assignment UI to Tutors section

### Steps taken
1. Added `Course` interface and state variables for courses, assignments, edits, save status, and dropdown open state.
2. Added `fetchCourses()` — fetches active courses sorted by code.
3. Added `fetchTutorAssignments()` — fetches all tutor_course_assignments and groups by tutor_id.
4. Both fetch functions are called during admin init alongside existing fetchPosts/fetchUsers.
5. Added helper functions: `getTutorCourses`, `hasCourseChanges`, `handleCourseToggle`, `handleCourseSave`.
6. `handleCourseSave` diffs selected vs original assignments, uses `upsert` (with onConflict) for additions and `delete` + `in` for removals.
7. Added "Courses" column to the Tutors table with:
   - Disabled hint ("Promote to tutor to assign courses") when role != tutor
   - Dropdown button showing count of selected courses
   - `CourseDropdown` component with checkbox list of active courses
   - Inline chip tags showing selected course codes with "x" to remove
   - "Save Courses" button (only visible when there are unsaved changes)
   - Per-tutor save status (success/error) with 3s auto-clear on success
8. Added `CourseDropdown` as a separate function component with click-outside-to-close via useRef + useEffect.

## Testing checklist
- Admin sees list of courses in multi-select
- Admin can assign 1+ courses to a tutor and save
- Refresh shows assignments persisted
- Removing a course deletes assignment
- Non-admin cannot insert/delete assignments (RLS)

## Testing steps
1. Ensure Ticket 44 migration is applied and courses table has seed data (e.g. PSW, HSW, IMM).
2. Log in as an admin user, navigate to `/app/admin`.
3. In the Tutors section, find a user with role="member" — the Courses column should show "Promote to tutor to assign courses" (greyed out).
4. Change that user's role to "tutor" and click Save. The Courses column should now show a "Select courses..." dropdown button.
5. Click the dropdown — a list of active courses with checkboxes should appear.
6. Check 2+ courses, see chips appear below the button, and a "Save Courses" button appears.
7. Click "Save Courses" — should show "Courses saved" in green, then auto-clear after 3s.
8. Refresh the page — the same courses should be pre-selected for that tutor.
9. Uncheck one course, click "Save Courses" — should save successfully.
10. Refresh again — confirm the removed course is gone.
11. (RLS test) Log in as a non-admin user. Attempt to insert/delete tutor_course_assignments via Supabase client or browser console — should fail with RLS error.
12. For admin/self rows, Courses column shows "-" (not editable).
