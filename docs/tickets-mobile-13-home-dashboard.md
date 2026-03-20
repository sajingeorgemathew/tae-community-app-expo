# MOBILE-13 — Member Home / Welcome dashboard shell

## Goal
Add a signed-in Home / Welcome dashboard screen to the mobile app that acts as the member landing page.

## Why
The web app has a real member home/dashboard experience with:
- welcome header
- quick actions
- summary cards
- recent posts preview
- navigation shortcuts

The mobile app should have a functional equivalent before final UI polish.

## Non-goals
- No final visual polish
- No gradient/card parity with web yet
- No realtime counts
- No advanced analytics
- No admin dashboard in this ticket
- No full search implementation yet

## Scope
This ticket should cover:
1) Add a Home tab/screen for signed-in members
2) Show welcome text using current user/profile
3) Add quick action buttons:
   - New Post
   - Ask Question
4) Add simple summary cards:
   - unread messages count (best effort)
   - Q&A activity count (best effort)
   - online members count (best effort or placeholder if current presence contract is not cheap to query)
5) Add a shortcut/action to browse Directory
6) Add a recent posts preview section (small list preview, e.g. latest 3)
7) Keep implementation stable and simple

## Existing context
Already working:
- auth/session
- Me/profile fetch
- Feed list + detail + new post
- Messages list/thread/send/media
- Questions list/detail
- Directory list/detail
- Faculty route work in progress / planned

## Expected behavior
### Home screen
Should show:
- Welcome text (e.g. "Welcome back, <name>")
- Quick action buttons:
  - Create Post
  - Ask Question
- Summary cards (read-only):
  - unread messages
  - new Q&A activity
  - online members
- A Directory shortcut
- Recent posts preview (small list)

### Navigation
Home should become a first-class signed-in destination.
Claude may:
- add it as a new tab, OR
- replace an existing low-priority tab if current tab count is too crowded

But the implementation must stay coherent and not break existing routes.

## Data contract
Use actual repo/backend contract for:
- profiles / current user name
- posts preview
- messages count (best effort)
- questions/answers count (best effort)
- presence/online members count only if simple and safe; otherwise use a placeholder or defer with a note

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep UI simple and stable
- Reuse existing screens/routes for quick action navigation
- No polling loop required in this ticket

## Files likely to touch
- apps/mobile/src/navigation/AppTabs.tsx
- apps/mobile/src/screens/HomeScreen.tsx (new)
- apps/mobile/src/lib/home.ts (optional helper)
- docs/tickets-mobile-13-home-dashboard.md

## Acceptance criteria
- Signed-in user can open Home
- Welcome header shows safely
- Quick actions navigate correctly
- Summary cards render without crashing
- Recent posts preview renders
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
2) Open Home
3) Verify welcome header appears
4) Tap Create Post -> navigates correctly
5) Tap Ask Question -> navigates correctly (or placeholder route if question create not built yet, with clear behavior)
6) Tap Directory shortcut -> navigates correctly
7) Verify recent posts preview appears