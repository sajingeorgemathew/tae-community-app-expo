# Ticket 48.1 — Q&A joins fix (profiles embed disambiguation)

## Problem
/app/questions shows "Failed to load questions" even when there are no questions.

## Root cause
public.questions has two foreign keys to profiles:
- questions_author_id_fkey (author_id → profiles)
- questions_target_tutor_id_fkey (target_tutor_id → profiles)

Supabase embed `profiles(...)` is ambiguous unless relationship is specified.

## Fix
Use explicit relationship syntax in select():
- author:profiles!questions_author_id_fkey(full_name, avatar_path)
- author:profiles!answers_author_id_fkey(full_name, avatar_path)

## Scope
- Update:
  - src/app/app/questions/page.tsx
  - src/app/app/questions/[id]/page.tsx
- No DB changes.

## Testing
- /app/questions loads (empty state + ask form visible)
- Can create a question as member
- Question detail loads + answers load
- Tutor/admin can answer
