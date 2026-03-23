# MOBILE-16C1 — Questions list enrichment

## Goal
Enrich the mobile Questions list so it feels closer to the web app’s Q&A list experience.

## Why
The current mobile Questions page works, but it is still thin compared to the web app. We want richer question cards before moving on to detail-page enrichment and answer composer permissions.

## Scope
This ticket should enrich the Questions list page with:
1) richer question card layout
2) author avatar/name/time
3) question body/meta preview
4) reply count
5) latest reply preview if present
6) no-replies state if none
7) role badge on latest replier if available

## Explicitly included
- Better question card presentation:
  - question title
  - author name
  - author avatar if available
  - created date/time
  - body/description/category/program preview if available
- Reply metadata:
  - reply count
  - latest reply preview
  - latest replier name if available
  - latest replier role badge if available
- Clean empty/loading/error states

## Explicitly NOT included
- No answer composer yet
- No question/answer edit/delete
- No moderation tools
- No final visual polish/theming pass
- No backend migrations/policies
- No realtime

## Important implementation note
Claude must inspect the real repo/backend contract and determine:
- where question list data comes from
- how replies/answers are counted
- how latest reply is determined
- how role badge is derived for latest replier
- how naming/avatar fallback is handled in the web app/current contract

If the latest reply preview is not available cheaply from the current query shape, Claude should still try to match the real behavior pragmatically and explain any approximation used.

## Existing context
Already working:
- Questions list route
- Question detail route
- basic answers rendering
- shared contract/types
- current profile/auth logic
- avatar/signed URL patterns elsewhere in app

## Expected behavior
### Questions list card
Each card should show:
- author avatar
- question title
- best-effort meta/body preview
- author name + created time
- reply count
- latest reply preview if present
- "No replies yet" or similar clean state if none
- latest replier role badge if available

### Navigation
- Tapping a question still opens Question Detail
- Existing detail route should keep working

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse current question query/detail routing where practical
- Keep UI simple and stable, not final polished

## Files likely to touch
- apps/mobile/src/screens/QuestionsScreen.tsx
- apps/mobile/src/components/* (optional shared question card component)
- apps/mobile/src/lib/questions.ts (optional helper refinement)
- docs/tickets-mobile-16c1-questions-list-enrichment.md

## Acceptance criteria
- Questions list cards feel richer and closer to web behavior
- Reply count displays correctly or best-effort from real contract
- Latest reply preview displays when available
- "No replies yet" state displays when applicable
- Existing Question Detail route still works
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
3) Verify richer cards render
4) Verify author avatar/name/time appear
5) Verify reply count and latest reply preview behavior
6) Tap a question
7) Verify Question Detail still opens