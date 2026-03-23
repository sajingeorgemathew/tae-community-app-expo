# MOBILE-16C3 — Answer composer with role gating

## Goal
Add answer submission to the mobile Question Detail page with correct role-based access:

- tutors can answer
- admins can answer
- regular members can read only

## Why
The Q&A list and detail pages are becoming richer, but the system still needs the core write action. This ticket adds answer submission while enforcing the real role rules used by the app.

## Scope
This ticket should cover:
1) Add answer composer to Question Detail
2) Show composer only to allowed roles
3) Allow tutors/admins to submit answers
4) Keep members read-only
5) Refresh answer list after successful submit

## Explicitly included
- Role-based answer composer visibility
- Answer submission
- Validation for empty answer
- UI refresh after success
- Clear read-only state for users who cannot answer

## Explicitly NOT included
- No answer edit/delete
- No question edit/delete
- No moderation tools
- No realtime updates
- No backend migrations/policies
- No final visual polish

## Important implementation note
Claude must inspect the real repo/backend contract and determine:
- how answers are stored
- how the web app currently creates answers
- what actual role values are used for tutor/admin/member
- how current user role is sourced in mobile
- whether answer creation requires any additional fields beyond question_id, author_id, and body/content

Claude must follow the real contract and not invent a fake role system.

## Existing context
Already working:
- Questions list route
- Question Detail route
- enriched question cards/detail page
- current profile/auth flow
- current role value on profiles
- answers basic rendering

## Expected behavior
### Question Detail
- If current user is tutor/admin:
  - show answer composer
  - allow answer submission
- If current user is a regular member:
  - do NOT show active composer
  - show a simple read-only notice like:
    - "Only tutors and admins can answer questions"

### Answer submission
- Empty answer blocked
- On success:
  - answer appears in list
  - count/section updates if shown
- Existing detail page remains stable

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse current question detail/answer query logic where practical
- Keep UI simple and stable

## Files likely to touch
- apps/mobile/src/screens/QuestionDetailScreen.tsx
- apps/mobile/src/lib/questions.ts
- docs/tickets-mobile-16c3-answer-composer-role-gating.md

## Acceptance criteria
- Tutor/admin sees answer composer
- Member does not see active answer composer
- Tutor/admin can submit answer
- Empty answer is blocked
- Answer appears after successful submit
- Existing question detail remains stable
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Sign in as admin or tutor
2) Open a question detail
3) Verify answer composer is visible
4) Type an answer and submit
5) Confirm answer appears
6) Sign in as regular member
7) Open the same question detail
8) Confirm answer composer is not active and read-only notice shows