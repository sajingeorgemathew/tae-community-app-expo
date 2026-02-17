# UI-03.6 Faculty Page Redesign

## Goal
Redesign /app/faculty to match premium white/navy theme with larger tutor cards.

## Critical Rule
Preserve existing behavior:
- Query logic (role='tutor' + is_listed_as_tutor=true)
- Profile click -> /app/profile/[id]
- Message click -> existing conversation or create_1to1 flow
- Presence dot logic (if already used here)

UI/layout only. No DB changes.

## Inspiration
Use docs/faculty.png as VISUAL inspiration only.
Ignore any elements not present in our app (filters, Q&A embed, booking widgets, etc.)

## Design Requirements
- Page header: "Faculty" + subtitle
- Tutor cards (premium):
  - Large avatar/photo (bigger than directory)
  - Name + role badge ("Tutor")
  - Headline
  - Skills chips
  - CTA row:
    - View Profile
    - Message
- Grid layout:
  - Desktop: 2–3 columns
  - Mobile: stacked
- Styled empty state if no tutors listed
- Keep consistent typography + spacing with other redesigned pages

## Acceptance
- No broken navigation
- No broken messaging flow
- No console errors
- Tutors look like a premium listing
