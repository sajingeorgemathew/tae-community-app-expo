# MOBILE-16D — Faculty + Directory enrichment and member-card parity

## Goal
Bring the Faculty and Directory sections of the mobile app closer to the web app by enriching list/detail screens and standardizing member-card behavior.

## Why
The mobile app now shows "Instructor" terminology, but functional parity is still incomplete in Faculty/Directory:
- explicit Instructor badge is missing
- profile navigation/button is missing or inconsistent
- message action/link is missing or inconsistent
- avatar/name click-through parity is incomplete

These are functional parity issues, not just final design polish.

## Scope
This ticket should cover:
1) Faculty list enrichment
2) Faculty detail enrichment
3) Directory list enrichment
4) Directory detail/profile-link enrichment
5) Shared member-card parity across Faculty + Directory:
   - Instructor badge
   - avatar/name click-through
   - Profile action/button
   - Message action/button

## Explicitly included
- Use monorepo web app as reference for behavior/content parity
- Improve Faculty and Directory cards/details
- Standardize member-card actions and labels
- Ensure Instructor display mapping is used consistently in these sections
- Keep profile navigation and message initiation coherent

## Explicitly NOT included
- No full presence green-dot rollout in this ticket
- No realtime presence/counters
- No final visual polish/theming pass
- No backend migrations/policies
- No giant search/filter redesign unless trivial

## Important implementation note
Claude must inspect the existing mobile app and the reference web implementation inside this monorepo to determine what is missing in Faculty/Directory parity.

Claude should identify and implement, where supported by current mobile/backend flows:
- explicit Instructor badge display
- avatar click-through to profile
- name click-through to profile (or equivalent profile button)
- message action/button where appropriate and already supported by messaging flow
- consistent display of headline/program/current work/qualifications/experience if practical

Claude must keep internal backend values unchanged (e.g. `tutor` may still exist internally) while showing `Instructor` in the UI.

## Existing context
Already working:
- SYS-01 display terminology alignment
- profile view
- directory/faculty basic routes
- messaging flow
- current user profile/auth state
- avatar rendering/signing patterns

## Expected behavior
### Faculty
- list cards feel richer and closer to web behavior
- Instructor badge appears explicitly where appropriate
- tapping avatar/name or Profile button reaches profile detail
- Message action exists if supported by current messaging flow
- detail page shows richer profile-like content

### Directory
- list cards feel richer and closer to web behavior
- avatar/name/profile behavior is consistent
- Message action exists if supported
- Instructor badge appears where relevant based on real role display logic

### Shared member-card behavior
Across Faculty and Directory, member cards should be more consistent in:
- avatar
- display name
- role/Instructor badge
- headline/meta preview
- profile action
- message action

## Technical constraints
- Do NOT change apps/web behavior in this monorepo except as reference inspection
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse existing profile and messaging flows where practical
- Keep UI simple and stable, not final polished

## Files likely to touch
- apps/mobile/src/screens/FacultyScreen.tsx
- apps/mobile/src/screens/FacultyDetailScreen.tsx
- apps/mobile/src/screens/DirectoryScreen.tsx
- apps/mobile/src/screens/ProfileDetailScreen.tsx (or equivalent profile detail screen)
- apps/mobile/src/components/* (likely reusable member card/profile summary pieces)
- docs/tickets-mobile-16d-faculty-directory-parity.md

## Acceptance criteria
- Faculty list/detail feel richer and closer to web behavior
- Directory list/detail feel richer and closer to web behavior
- Instructor badge is explicitly shown where appropriate
- Profile navigation/button works from Faculty/Directory cards
- Message action works where supported
- Existing navigation remains stable
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
2) Open Faculty
3) Verify richer cards/details render
4) Verify Instructor badge appears where appropriate
5) Tap avatar/name/Profile and confirm profile opens
6) Tap Message where available and confirm messaging flow works
7) Open Directory
8) Verify the same core member-card behavior works there too