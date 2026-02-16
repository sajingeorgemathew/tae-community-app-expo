# UI-03.1 Profile Completion Banner (Dashboard)

## Goal
Redesign the "Complete your profile" banner on /app to match the new white/navy theme.

## Scope
- UI only
- Must preserve existing "only show when incomplete" logic
- No DB changes, no route changes

## Requirements
- Card/banner style: white background, subtle border/shadow, rounded corners
- Navy accent (left border or icon)
- Clear CTA button: "Complete Profile" -> /app/me
- Optional checklist items for missing fields (only if available from existing data)

## Acceptance
- Banner looks premium and consistent with dashboard hero + stat cards
- Still only appears when profile incomplete
- No functional regressions

## Implementation Notes
- **File changed:** `src/app/app/page.tsx`
- Moved the profile-incomplete prompt from an inline link inside the hero banner to a standalone card between the hero and the quick-search bar.
- Card design: white bg, `border-gray-200`, `shadow-sm`, `rounded-xl`, navy (`slate-800`) left accent stripe, person icon.
- Added `missingFields` state (string array) derived from the same existing checks (`hasAvatar`, `hasHeadline`, `hasSkills`, `hasProgramYear`). No logic changes — just captures which checks failed.
- Renders a small checklist of missing items using amber dot indicators.
- CTA button "Complete Profile" links to `/app/me` with a navy (`slate-800`) background.
- No new components, no DB changes, no route changes.
