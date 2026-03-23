# MOBILE-16C2 — Question detail + answers enrichment

## Goal
Enrich the mobile Question Detail page so it feels closer to the web app’s question/answers experience.

## Why
The list page is being enriched in MOBILE-16C1, but the detail page still needs parity:
- richer question header card
- clearer answer presentation
- author/avatar/time/meta display
- role badges for answer authors
This should be completed before adding the answer composer with role gating.

## Scope
This ticket should enrich the Question Detail page with:
1) richer question header card
2) better question author/avatar/time/meta presentation
3) cleaner answers list
4) role badge on answer authors when available
5) better empty/loading/error states

## Explicitly included
- Better question header layout:
  - title
  - author name
  - author avatar if available
  - created date/time
  - body/content
  - category/program/meta if available
- Better answer card presentation:
  - answer author name
  - answer author avatar if available
  - created time
  - answer body
  - role badge if available
- Clean "no answers yet" state

## Explicitly NOT included
- No answer composer yet
- No question/answer edit/delete
- No moderation actions
- No realtime updates
- No backend migrations/policies
- No final visual polish/theming pass

## Important implementation note
Claude must inspect the real repo/backend contract and determine:
- how question detail is currently queried
- how answers are currently queried
- how author/avatar/name fallbacks work
- how role badge is derived for answer authors
- whether category/program/meta fields are part of the real question shape

If some metadata is not cheaply available from the current contract, Claude should keep the detail page stable and explain any best-effort approximation used.

## Existing context
Already working:
- Questions list
- Question detail basic route
- answers basic rendering
- shared contract/types
- current profile/auth logic
- avatar/signed URL patterns elsewhere in app

## Expected behavior
### Question detail page
Should show:
- richer question header card
- question title/body/meta
- author avatar/name/time
- answers section with count if practical
- answer cards with avatar/name/time/role badge
- clean no-answers state if none

### Navigation
- Existing question detail route remains the same
- Page stays read-focused and stable

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse current question detail query logic where practical
- Keep UI simple and stable, not final polished

## Files likely to touch
- apps/mobile/src/screens/QuestionDetailScreen.tsx
- apps/mobile/src/components/* (optional shared answer/question card component)
- apps/mobile/src/lib/questions.ts (optional helper refinement)
- docs/tickets-mobile-16c2-question-detail-enrichment.md

## Acceptance criteria
- Question detail feels richer and closer to web behavior
- Question author/avatar/time render safely
- Answer cards render clearly
- Role badge displays when derivable
- No-answers state displays when applicable
- Existing question routing remains stable
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Sign in
2) Open Questions
3) Tap a question
4) Verify richer question header renders
5) Verify answer list renders clearly
6) Verify role badge appears if available
7) Verify no-answers state if applicable