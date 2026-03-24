# SYS-01 — Tutor → Instructor terminology blueprint + mobile UI alignment

## Goal
Standardize user-facing terminology in the mobile app so "Tutor" is replaced with "Instructor" wherever appropriate in the UI, while keeping backend/schema/internal contract names unchanged.

## Why
We want cleaner product language for end users without risking backend/schema breakage. The current system may still use internal names like `tutor` in:
- database fields
- roles
- helpers
- filters
- migrations
- policies

Those internal names should remain unchanged for now.

## Core rule
- UI wording changes: YES
- backend/schema/internal renames: NO

## Scope
This ticket should cover:
1) Audit mobile user-facing terminology where "Tutor" appears
2) Replace mobile UI text with "Instructor" where appropriate
3) Keep internal role values / DB field names unchanged
4) Add a blueprint note describing what later needs to be changed in the separate real web repo

## Explicitly included
- Mobile UI labels/text updates
- Mobile screen titles, buttons, headings, helper text, badges, placeholders, section names
- Documentation note for later separate web repo follow-up

## Explicitly NOT included
- No DB schema rename
- No Supabase role value rename
- No migration changes
- No policy changes
- No apps/web UX changes in this monorepo unless absolutely necessary for reference checking
- No route/path rename unless purely display text

## Important implementation note
Claude must inspect the current mobile app and identify where "Tutor" is used in user-facing text.

Examples may include:
- Faculty section labels
- tutor badges / headings
- tutor-related call-to-action text
- role display text
- answer permission notices
- profile/faculty cards

Claude must distinguish carefully between:
1) user-facing display text → should become "Instructor"
2) internal contract names (e.g. role values like `tutor`) → should remain unchanged

## Existing context
Already working:
- Faculty area
- Questions / answers with tutor/admin permissions
- Home dashboard
- profile/faculty-related screens
- current shared role logic

## Expected behavior
### In mobile UI
- Users should see "Instructor" instead of "Tutor" where it is a display label
- Existing role-based logic must continue to work exactly as before

### In code/backend
- Internal role checks may still use values like `tutor`
- Queries/policies/helpers must not be broken

## Technical constraints
- Do NOT change apps/web behavior in this monorepo except for reference inspection
- Do NOT rename schema fields, role values, migrations, or policies
- Keep changes focused to apps/mobile and docs
- Keep the implementation safe and minimal

## Files likely to touch
- apps/mobile/src/** (wherever user-facing tutor text appears)
- docs/tickets-sys-01-instructor-terminology.md
- optionally a small project note file if Claude thinks it helps document later separate-web follow-up

## Acceptance criteria
- User-facing "Tutor" text in mobile is replaced with "Instructor" where appropriate
- Internal backend/schema logic remains unchanged
- Existing tutor/admin permission behavior continues to work
- A documented note exists for later applying similar wording in the separate real web repo
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Open the mobile app
2) Visit areas where tutor-related wording previously appeared
3) Confirm UI now says "Instructor" where appropriate
4) Confirm features still work normally
5) Confirm no permission logic is broken

---

## Implementation notes (completed)

### Shared display-mapping helper
- **`src/lib/roles.ts`** (new): Centralized `displayRole(role)` function that maps internal role values to user-facing labels. `"tutor"` → `"Instructor"`. Unknown roles are auto-capitalised. This is the single source of truth for role display text across the mobile app.

### Mobile changes made

#### Phase 1 (Questions screens — initial pass)
- **QuestionDetailScreen.tsx**: Changed user-facing text "Only tutors and admins can answer questions" → "Only Instructors and admins can answer questions"
- **QuestionDetailScreen.tsx**: `RoleBadge` component now uses shared `displayRole()` instead of inline `ROLE_DISPLAY_LABELS`
- **QuestionsScreen.tsx**: `RoleBadge` component now uses shared `displayRole()` instead of inline `ROLE_DISPLAY_LABELS`

#### Phase 2 (Remaining screens — full terminology pass)
- **DirectoryScreen.tsx**: `secondaryLine()` now passes `profile.role` through `displayRole()` — was previously showing raw "tutor"
- **FacultyScreen.tsx**: `secondaryLine()` now passes `profile.role` through `displayRole()` — was previously showing raw "tutor"
- **FacultyDetailScreen.tsx**: Role display now uses `displayRole(profile.role)` instead of raw `profile.role` with CSS `textTransform: capitalize`
- **MeScreen.tsx**: Role display now uses `displayRole(profile.role)` instead of raw `profile.role` with CSS `textTransform: capitalize`
- **ProfileDetailScreen.tsx**: Role display now uses `displayRole(profile.role)` instead of raw `profile.role` with CSS `textTransform: capitalize`
- Removed `textTransform: "capitalize"` from role styles in FacultyDetailScreen, MeScreen, and ProfileDetailScreen — no longer needed since `displayRole()` handles proper casing

### Internal values preserved (not changed)
- `"tutor"` role constant in `questions.ts` (`ANSWER_ROLES` set)
- `answer.author_role === "tutor"` check in `QuestionDetailScreen.tsx`
- `question.latest_replier_role === "tutor"` check in `QuestionsScreen.tsx`
- Supabase query filter `is_listed_as_tutor.eq.true,role.eq.tutor` in `FacultyScreen.tsx`

### Separate web repo follow-up required
The separate real web repository will need equivalent terminology updates:
- Audit all user-facing "Tutor" text in the web UI
- Apply the same display-mapping approach (internal role values stay `tutor`, UI shows "Instructor")
- Areas to check: role badges, permission notices, faculty listings, any admin panels showing role labels