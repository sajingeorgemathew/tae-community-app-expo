# Ticket 43 — Admin Tutor Management UI

## Goal
Admins can promote/demote tutors and control whether they appear on Faculty page.

## UI Location
/app/admin (add a new “Tutors” section)

## Features
- Search users by name (and optionally program)
- Show results list (avatar, name, role, program, grad_year)
- For each user:
  - Set role: member/tutor
  - Toggle: is_listed_as_tutor (enabled only when role=tutor)
  - Save button (persists changes)

## Security
- Only admins can access this UI section
- Writes must rely on Supabase RLS (no service role key)
- Non-admin attempts to update role/listing must fail (RLS error)

## Non-goals
- No course assignment (Ticket 45)
- No Q&A integration
- No audit logs

## Manual Supabase Setup
None for UI.
(Use existing DB columns: profiles.role and profiles.is_listed_as_tutor)

## Testing checklist
- Admin can update another user to tutor + listed
- Admin can demote tutor to member (listing resets off)
- Non-admin cannot access admin page (shows Not Authorized)
- Non-admin update attempts fail with RLS
- Faculty page shows only tutor + listed users