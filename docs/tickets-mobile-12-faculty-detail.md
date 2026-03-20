# MOBILE-12 — Faculty / tutor list + detail

## Goal
Implement the Faculty area in the Expo app:
- Faculty tab shows a list of tutor/faculty profiles
- Tapping a faculty member opens a Faculty Detail screen
- Keep the implementation read-only, stable, and aligned with current backend contracts

## Non-goals
- No faculty editing
- No tutor assignment management
- No admin-only controls
- No messaging shortcut from faculty detail in this ticket
- No advanced filtering/search unless trivial
- No realtime/polling improvements

## Scope
This ticket should cover:
1) Faculty list screen
2) Faculty detail screen
3) Navigation wiring from Faculty tab to detail route
4) Avatar rendering if present

## Existing context
Already working:
- auth/session
- navigation and route stacks
- read-only list/detail patterns for Directory, Feed, Questions
- shared contract/types in @tae/shared
- mobile Supabase client
- signed URL helpers for private avatars

## Expected behavior
### Faculty list
Each row should show:
- faculty/tutor name
- role/title if available
- program/course/supporting metadata if available
- avatar if present
- tap opens Faculty Detail

### Faculty detail
Should show:
- avatar
- name
- role/title
- headline/bio if available
- program/course/qualifications/experience if available
- loading / empty / error states

## Data contract
Use the actual backend contract from the repo / @tae/shared:
- likely sourced from `profiles`
- filter to faculty/tutor rows using the real available field(s), for example:
  - role
  - is_listed_as_tutor
  - tutor-related assignments
Claude must inspect the real schema/code and use the correct filter path.

If shared types differ from actual queried shape, map safely and keep optional fields optional.

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep UI simple and stable
- Reuse current navigation patterns from MOBILE-04 / MOBILE-05 / MOBILE-10

## Files likely to touch
- apps/mobile/src/navigation/AppTabs.tsx
- apps/mobile/src/navigation/FacultyStack.tsx (new)
- apps/mobile/src/screens/FacultyScreen.tsx
- apps/mobile/src/screens/FacultyDetailScreen.tsx (new)
- apps/mobile/src/lib/faculty.ts (optional helper)
- docs/tickets-mobile-12-faculty-detail.md

## Acceptance criteria
- Signed-in user can open Faculty tab
- Faculty list loads without crashing
- Tapping a faculty member opens Faculty Detail
- Avatar renders if available
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
2) Open Faculty tab
3) Verify faculty list loads
4) Tap a faculty/tutor profile
5) Verify detail screen loads
6) Back returns to list