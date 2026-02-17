# UI-03.7 Questions List Redesign + Answered Indicators

## Goal
Redesign /app/questions list page to match premium white/navy theme and improve readability.

## Critical Rule
Preserve:
- Existing fetch logic
- Existing "Ask a Question" form/modal behavior
- Existing navigation to /app/questions/[id]
- Any existing badge/count logic

UI/layout only.

## Inspiration
Use docs/questionlist.png as visual inspiration only.
Ignore any features not present in our app.

## Design Requirements
- Page header: "Questions" + subtitle
- Primary CTA: "Ask a Question" (navy)
- Layout: full-width container (fits screen, no narrow boxing)
- Question cards:
  - Title
  - Body preview (truncate)
  - Author (avatar + name) if currently shown
  - Meta row: time, answer count
  - Answered indicator:
    - If answer_count > 0 -> show "Answered" badge (or "2 replies")
    - If 0 -> show "No replies yet"
  - Optional: show last replier name if already available (do not invent if not fetched)

- States:
  - Loading state styled
  - Empty state styled
  - Error state styled

## Acceptance
- No broken navigation
- Ask question still works
- Cards are responsive and fit screen nicely
- Looks consistent with other redesigned pages

## Implementation Notes

### Changes made (UI-only)
- **File modified**: `src/app/app/questions/page.tsx`
- No new components created (kept in single file for simplicity)
- No logic, state, query, or handler changes

### Design details
- Container: `max-w-6xl mx-auto` with `p-6 md:p-10` responsive padding
- Header: bold navy title + slate subtitle, navy CTA button right-aligned
- Cards: `rounded-xl border border-gray-200 bg-white shadow-sm` with `hover:shadow-md hover:border-emerald-200`
- Title hover: `group-hover:text-emerald-700`
- Reply indicators: emerald for reply counts, blue-50 badges for tutor/admin roles
- Online dots: emerald-500 (matching directory/faculty)
- Form: styled inputs with navy focus ring, rounded-lg
- Loading: 4-card skeleton with pulse animation
- Empty: centered card with emerald icon, message, and helper text
- Error: red banner with rounded-xl styling

### Preserved (unchanged)
- `fetchQuestions()` RPC call and mapping logic
- `handleSubmit()` form submission
- `onlineSet` presence tracking
- `refreshMetrics()` badge sync
- `formatDate()`, `truncate()`, `renderReplyPreview()` helpers
- All state variables and their names
- Navigation to `/app/questions/[id]` via Link

### Testing
1. Navigate to `/app/questions` — verify styled cards render
2. Click "Ask a Question" — form appears with styled inputs
3. Submit a question — posts successfully, list refreshes
4. Click a question card — navigates to `/app/questions/[id]`
5. Verify reply indicators: "No replies yet" (gray italic), "X replies" (emerald), role badges
6. Verify online dots show on authors who are online
7. Verify loading skeleton displays on initial load
8. Verify responsive layout on mobile/tablet
9. No console errors
