# UI-03.8 Question Detail Redesign

## Goal
Redesign /app/questions/[id] to match premium white/navy theme:
- Question card (title, body, author)
- Answers stack (clean bubbles/cards)
- Premium answer form (tutor/admin only)

## Critical Rule
Preserve existing behavior:
- Fetch question + answers logic
- Role gating for answer form (tutor/admin only)
- Insert answer logic + loading/error handling
- Navigation (back to questions)
- Any metrics refresh logic

UI/layout only.

## Inspiration
Use docs/questionanswer.png as visual inspiration only.
Ignore any features not present in our app (votes, accepted answer, tags, etc.)

## Design Requirements
- Top header row:
  - Back link to /app/questions
  - Page title
- Question card:
  - Title strong
  - Body readable, line spacing
  - Author row (avatar + name) if currently available
  - Created time
- Answers section:
  - Section header "Answers" + count
  - Each answer as card/bubble:
    - Author avatar + name (if available)
    - Timestamp subtle
    - Body
- Answer form:
  - Visible only for tutor/admin (existing logic)
  - Card with textarea + submit button navy
  - Disabled while submitting
- Empty state: "No answers yet"
- Responsive full-width (no narrow boxing)

## Acceptance
- Answer form still appears only for tutor/admin
- Posting an answer still works
- No console errors
- Looks consistent with other redesigned pages

## Implementation Notes

### Changes made
- **File:** `src/app/app/questions/[id]/page.tsx` — UI-only redesign, no new components needed

### What changed (UI only)
1. **Layout:** Added `max-w-4xl mx-auto` container with `p-6 md:p-10` padding
2. **Back link:** Navy `#1e293b` with `font-medium hover:underline` (matches questions list page)
3. **Question card:** `rounded-xl border border-gray-200 bg-white shadow-sm` with increased padding (`p-6 md:p-8`)
4. **Title:** `text-2xl font-bold text-[#1e293b]`
5. **Author row:** Name in `font-medium text-[#1e293b]`, timestamp in `text-xs text-slate-400`, separated by `·`
6. **Body text:** `text-slate-700 leading-relaxed` for better readability
7. **Online dots:** Changed from `bg-green-500` to `bg-emerald-500` (consistent with other pages)
8. **Answers section:** Header with count in `text-slate-400` parenthetical
9. **Answer cards:** `rounded-xl border border-gray-200 bg-white p-5 shadow-sm`
10. **Empty state:** Centered card with emerald icon + italic message (matches directory/faculty pattern)
11. **Answer form:** Card with premium textarea (`focus:border-[#1e293b] focus:ring-1`) + navy submit button
12. **Loading state:** Skeleton placeholders with `animate-pulse` (replaces plain "Loading..." text)
13. **Error/not-found states:** Styled cards with icons (replaces plain text)

### What was preserved (no changes)
- All state variables and hooks unchanged
- `fetchAnswers()` query logic unchanged
- `handleSubmitAnswer()` logic unchanged
- `canAnswer` role gating unchanged (`admin || tutor`)
- Presence/online logic unchanged
- `formatDate()` helper unchanged
- `useAvatarUrls` / `Avatar` usage unchanged

### Testing
1. Visit `/app/questions/[id]` — question card + answers render with new styling
2. Log in as tutor/admin — answer form visible with navy button
3. Log in as member — answer form hidden
4. Submit an answer — form clears, new answer appears in list
5. Visit non-existent question ID — styled "not found" card appears
6. Check browser console — no errors
