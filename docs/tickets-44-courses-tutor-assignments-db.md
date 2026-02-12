# Ticket 44 — Courses + Tutor Assignment DB (schema + RLS only)

## Goal
Add a scalable course mapping system so tutors can be assigned to courses/programs.

## Tables
### courses
Stores course/program definitions used in filters and tutor matching.

Suggested columns:
- id (uuid PK)
- code (text, unique) — e.g., PSW, HSW, IMM
- title (text)
- is_active (boolean default true)
- created_at (timestamptz default now())

### tutor_course_assignments
Join table between tutor profiles and courses.

Columns:
- id (uuid PK)
- tutor_id (uuid FK -> profiles.id, ON DELETE CASCADE)
- course_id (uuid FK -> courses.id, ON DELETE CASCADE)
- created_at (timestamptz default now())
Unique constraint: (tutor_id, course_id)

## RLS
- courses:
  - SELECT: authenticated
  - INSERT/UPDATE/DELETE: admin only
- tutor_course_assignments:
  - SELECT: authenticated
  - INSERT/DELETE: admin only
  - UPDATE: none

Admin check pattern:
exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')

## Non-goals
- No admin UI to assign courses (Ticket 45)
- No faculty filtering (Ticket 46)
- No Q&A

## Migration file

`supabase/migrations/20250212_ticket44_courses_tutor_assignments_db.sql`

### Indexes added
- `idx_tutor_course_assignments_tutor_id`
- `idx_tutor_course_assignments_course_id`

## Applying

```bash
supabase db reset   # reapplies all migrations
# or apply just this migration:
supabase migration up
```

## Manual Supabase steps
- Apply migration SQL to hosted Supabase.
- (Optional) Seed a few courses for testing: PSW, HSW, Immigration.

## Testing checklist
- Authenticated users can read courses and assignments
- Non-admin cannot create/update/delete courses or assignments
- Admin can create courses and assignments
- Unique constraint prevents duplicates