# MOBILE-10 — Questions list + question detail

## Goal
Implement the Questions area in the Expo app:
- Questions tab shows a list of questions
- Tapping a question opens a Question Detail screen
- Question Detail shows the question and its answers (read-only)
- Keep the implementation stable, simple, and aligned with existing backend contracts

## Non-goals
- No create question flow yet
- No post answer flow yet
- No edit/delete question or answer
- No advanced filtering/search beyond a simple placeholder if needed
- No realtime/polling improvements

## Scope
This ticket should cover:
1) Questions list screen
2) Question detail screen
3) Navigation wiring from Questions tab to detail route
4) Read-only rendering of answers on detail screen

## Existing context
Already working:
- auth/session
- navigation and route stacks
- read-only list/detail patterns for Directory and Feed
- shared contract/types in @tae/shared
- mobile Supabase client

## Expected behavior
### Questions list
Each row should show:
- question title or main prompt
- author name (best effort)
- created date if available
- short preview of body/content if available
- answer count if available (optional, best effort)

### Question detail
Should show:
- full question title
- full question body/content
- author name (best effort)
- created date if available
- list of answers below (read-only)
- loading / empty / error states

## Data contract
Use the actual backend contract from the repo / @tae/shared:
- questions
- answers
- author joins if available
- question detail route param should use the real question id

If shared types differ from actual queried shape, map safely and keep optional fields optional.

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep UI simple and stable
- Use existing navigation patterns from MOBILE-04 / MOBILE-05 / MOBILE-06

## Files likely to touch
- apps/mobile/src/navigation/AppTabs.tsx
- apps/mobile/src/navigation/QuestionsStack.tsx (new)
- apps/mobile/src/screens/QuestionsScreen.tsx
- apps/mobile/src/screens/QuestionDetailScreen.tsx (new)
- apps/mobile/src/lib/questions.ts (optional helper)
- docs/tickets-mobile-10-questions-detail.md

## Acceptance criteria
- Signed-in user can open Questions tab
- Questions list loads without crashing
- Tapping a question opens Question Detail
- Answers render in Question Detail if present
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
2) Open Questions tab
3) Verify questions list loads
4) Tap a question
5) Verify detail loads
6) Verify answers show (or empty state if none)
7) Back returns to list