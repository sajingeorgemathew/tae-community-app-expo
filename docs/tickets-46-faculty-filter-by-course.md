# Ticket 46 — Faculty Page: Filter by Course + Search

## Goal
Enhance /app/faculty so students can find tutors by course and name/skills.

## Scope
- Add search input (filters by tutor name/headline/skills/program)
- Add course filter dropdown
- Update query to join tutor_course_assignments + courses
- Show course tags/badges on tutor cards
- Keep Message button behavior intact

## Data rules
Show only profiles where:
- role='tutor'
- is_listed_as_tutor=true

Course tags:
- show courses assigned via tutor_course_assignments joined to courses (active only)

Filtering behavior
- If course filter selected: show only tutors assigned to that course
- If search text present: filter tutors by name/headline/skills/program (client-side filter OK for MVP)

## Non-goals
- No Q&A
- No pagination optimization beyond a reasonable limit
- No courses admin UI changes

## Manual Supabase steps
- Ensure courses exist
- Ensure at least one tutor has at least one course assignment

## Testing checklist
- Faculty shows tutors + their course tags
- Course dropdown filters tutors correctly
- Search filters tutors correctly
- Combined search + course filter works
- No tutors => empty state

