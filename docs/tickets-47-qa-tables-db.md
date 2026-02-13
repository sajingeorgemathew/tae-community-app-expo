# Ticket 47 — Q&A Tables (DB only)

## Goal
Create a standalone Q&A subsystem with clean RLS.

## Tables
### questions
- id uuid PK
- title text NOT NULL
- body text NOT NULL
- author_id uuid NOT NULL -> profiles.id (ON DELETE CASCADE)
- target_tutor_id uuid NULL -> profiles.id (ON DELETE SET NULL)
- target_course_id uuid NULL -> courses.id (ON DELETE SET NULL)
- created_at timestamptz NOT NULL default now()
- updated_at timestamptz NOT NULL default now()

### answers
- id uuid PK
- question_id uuid NOT NULL -> questions.id (ON DELETE CASCADE)
- body text NOT NULL
- author_id uuid NOT NULL -> profiles.id (ON DELETE CASCADE)
- created_at timestamptz NOT NULL default now()
- updated_at timestamptz NOT NULL default now()

## Indexes & constraints
- answers: index on question_id
- questions: index on created_at, author_id
- Optional: ensure target_tutor_id (if set) points to a tutor role (enforced later by app logic; DB constraint optional)

## RLS
Enable RLS on both tables.

### questions policies
- SELECT: authenticated
- INSERT: authenticated, author_id = auth.uid()
- UPDATE: author only (author_id = auth.uid())
- DELETE: author OR admin

### answers policies
- SELECT: authenticated
- INSERT: only tutor/admin, author_id = auth.uid()
- UPDATE: author only
- DELETE: author OR admin

Admin check pattern:
exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')

Tutor/admin insert pattern:
exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','tutor'))

## Non-goals
- No UI pages
- No notifications
- No embedding under faculty yet

## Implementation notes
- Migration: `supabase/migrations/20250213_ticket47_qa_tables_db.sql`
- Created reusable `public.set_updated_at()` trigger function for auto-maintaining `updated_at` columns
- Triggers: `trg_questions_updated_at`, `trg_answers_updated_at`

## Manual Supabase steps
- Apply migration SQL to hosted Supabase.
- Optional: insert 1-2 seed questions for testing.

## Testing checklist

### Setup
Run the migration against your Supabase instance (local or hosted).

### As a **member** (role = 'member'):
1. **SELECT questions** — should return rows (empty set OK) ✅
2. **INSERT question** with `author_id = auth.uid()` — should succeed ✅
3. **INSERT question** with `author_id = <other user>` — should be denied ❌
4. **UPDATE own question** (change title/body) — should succeed ✅
5. **DELETE own question** — should succeed ✅
6. **DELETE another user's question** — should be denied ❌
7. **INSERT answer** — should be denied (not tutor/admin) ❌

### As a **tutor** (role = 'tutor'):
1. **INSERT answer** with `author_id = auth.uid()` — should succeed ✅
2. **INSERT answer** with `author_id = <other user>` — should be denied ❌
3. **UPDATE own answer** — should succeed ✅
4. **DELETE own answer** — should succeed ✅
5. **DELETE another user's answer** — should be denied ❌

### As an **admin** (role = 'admin'):
1. **INSERT answer** with `author_id = auth.uid()` — should succeed ✅
2. **DELETE any question** — should succeed ✅
3. **DELETE any answer** — should succeed ✅

### updated_at trigger:
1. Insert a question, note `updated_at`
2. Update the question body after a short wait
3. Verify `updated_at` changed to a newer timestamp

### Cascade behavior:
1. Delete a profile that authored questions → questions should be deleted
2. Delete a question that has answers → answers should be deleted
3. Delete a tutor profile referenced by `target_tutor_id` → question remains, `target_tutor_id` becomes NULL
4. Delete a course referenced by `target_course_id` → question remains, `target_course_id` becomes NULL
