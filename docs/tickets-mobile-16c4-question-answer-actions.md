# MOBILE-16C4 — Question/answer owner-admin actions

## Goal
Add owner/admin actions to the mobile Q&A system so:
- a question owner can edit/delete their own question
- an answer owner can edit/delete their own answer
- an admin can delete/moderate questions and answers if the real backend contract supports it

## Why
The Q&A system is now functionally strong, but ownership/moderation actions are still missing. This ticket completes the core Q&A interaction model before moving on to other sections.

## Scope
This ticket should cover:
1) Show edit/delete actions for question owner
2) Allow question owner to edit/delete own question
3) Show edit/delete actions for answer owner
4) Allow answer owner to edit/delete own answer
5) Allow admin delete-any-question / delete-any-answer if supported by the real backend contract

## Explicitly included
- Ownership-aware actions for questions
- Ownership-aware actions for answers
- Edit own question
- Delete own question
- Edit own answer
- Delete own answer
- Admin delete moderation if already supported by backend/web contract
- UI refresh after success

## Explicitly NOT included
- No full moderation dashboard
- No role/permission schema changes
- No backend migrations/policies
- No realtime updates
- No final visual polish/theming pass

## Important implementation note
Claude must inspect the real repo/backend contract and determine:
- how questions are updated/deleted
- how answers are updated/deleted
- whether owners can edit/delete
- whether admins can delete any question/answer
- whether admins can edit others’ content (do NOT assume this)

Default permission expectation:
- question owner: edit + delete own question
- answer owner: edit + delete own answer
- admin: delete any question/answer if supported
- admin editing others' content should NOT be added unless clearly supported and used by the existing system

## Existing context
Already working:
- Questions list enrichment
- Question detail + answers enrichment
- Answer composer with role gating
- Current user role/profile in mobile
- existing current-user ownership patterns in feed work

## Expected behavior
### Question actions
- If current user owns the question:
  - show Edit
  - show Delete
- If current user is admin and backend supports it:
  - show Delete
- Do not expose edit-anyone's-question unless clearly supported by real contract

### Answer actions
- If current user owns the answer:
  - show Edit
  - show Delete
- If current user is admin and backend supports it:
  - show Delete
- Do not expose edit-anyone's-answer unless clearly supported by real contract

### Edit flow
- simple inline or dedicated edit screen/modal is acceptable
- save updates UI after success

### Delete flow
- confirmation prompt before delete
- delete succeeds and UI refreshes accordingly

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse current question/answer helpers where practical
- Keep UI simple and stable

## Files likely to touch
- apps/mobile/src/screens/QuestionsScreen.tsx (only if needed for question delete refresh)
- apps/mobile/src/screens/QuestionDetailScreen.tsx
- apps/mobile/src/lib/questions.ts
- docs/tickets-mobile-16c4-question-answer-actions.md

## Acceptance criteria
- Question owner can edit/delete own question
- Answer owner can edit/delete own answer
- Admin delete behavior works if supported
- UI refreshes correctly after edit/delete
- Existing Q&A flows remain stable
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Sign in as question owner
2) Edit your question
3) Delete your question
4) Sign in as answer owner
5) Edit your answer
6) Delete your answer
7) If admin testing is available:
   - open someone else’s question/answer
   - confirm delete is available only if supported