# MOBILE-16A — Me/Profile enrichment

## Goal
Enrich the existing Me/Profile area in the mobile app so it feels closer to the web app’s profile experience.

## Why
The current mobile Me screen is functional but still thin compared to the web app. We want to improve the signed-in user’s profile experience before the final UI polish pass.

## Scope
This ticket should enrich the Me screen with:
1) richer profile header / profile summary layout
2) profile completeness / completion nudge (best-effort based on current available fields)
3) My Posts section (recent posts authored by the signed-in user)
4) improved empty/loading states for profile and posts

## Explicitly included
- Better profile summary presentation:
  - avatar
  - name
  - role
  - headline
  - key fields like program / grad_year / current_work / qualifications / experience if available
- Profile completeness card/nudge:
  - calculate best-effort completeness from currently supported profile fields
  - show missing items or completion percentage in a simple way
- My Posts preview:
  - fetch recent posts where author_id = current user id
  - show a limited list (e.g. latest 3–5)
  - reuse simple card rendering already established in mobile feed if practical

## Explicitly NOT included
- No profile edit redesign (existing edit flow stays)
- No avatar delete action
- No post edit/delete actions in this ticket
- No reactions create flow
- No comments create/edit/delete flow
- No full feed redesign
- No realtime/count updates
- No backend migrations/policies

## Important note on scope
This ticket may render post metadata in My Posts if already available cheaply, but it should NOT try to solve all feed interaction parity. Feed enrichment and engagement are separate tickets.

## Existing context
Already working:
- auth/session
- Me/profile read
- profile edit
- avatar upload
- feed list + detail + new post
- shared contract/types
- signed URL helpers

## Expected behavior
### Me screen
Should now include:
- enriched profile section
- profile completeness card/nudge
- My Posts section below profile content

### Profile completeness
Best-effort calculation from fields actually used in current app contract, for example:
- full_name
- headline
- program
- grad_year
- current_work
- qualifications
- experience
- skills
Claude should use the real available field set and keep null-safe behavior.

### My Posts
- fetch latest posts authored by the signed-in user
- show a short list
- if no posts: show a clean empty state
- tapping a post can optionally route to existing PostDetail if trivial and already available

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse existing profile/post helpers where practical
- Keep UI simple and stable; no final design polish yet

## Files likely to touch
- apps/mobile/src/screens/MeScreen.tsx
- apps/mobile/src/state/profile.tsx (if completeness/refresh helpers need extension)
- apps/mobile/src/lib/posts.ts (if own-post helper is added)
- apps/mobile/src/components/* (optional small shared card section if Claude chooses)
- docs/tickets-mobile-16a-me-profile-enrichment.md

## Acceptance criteria
- Me screen shows richer profile content
- Profile completeness card/nudge renders safely
- My Posts section loads signed-in user's recent posts
- Empty/loading/error states are clean
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
2) Open Me
3) Verify enriched profile section renders
4) Verify completeness card shows
5) Verify My Posts section shows recent posts or empty state
6) If post cards are tappable, verify they open post detail