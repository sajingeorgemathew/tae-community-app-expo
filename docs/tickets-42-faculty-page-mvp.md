# Ticket 42 — /faculty page 

## Goal
Add a safe, read-only Faculty page listing tutors.

## Route
/app/faculty

## Data rules
List users where:
- profiles.role = 'tutor'
- profiles.is_listed_as_tutor = true

## UI (tutor card)
Show:
- avatar
- full_name
- headline
- skills
- Message button (opens existing messaging flow, or navigates to /app/messages with preselect)

## Non-goals
- No filtering/search
- No course mapping
- No Q&A
- No admin tutor management UI

## Manual Supabase steps (for testing)
Until Ticket 43 exists, create tutors manually:
- profiles.role = 'tutor'
- profiles.is_listed_as_tutor = true

## Testing checklist
- Faculty page loads for authenticated users
- Only tutors (role=tutor and listed=true) appear
- No tutors => empty state message
- Message button navigates to messaging flow without errors 