# UI-03.9 Unified Profile Routing + Layout

## Goal
Unify profile UI so all profile views use the premium layout:
- /app/profile/[id] redesigned to match new style
- profile cards consistent when accessed from Directory / Faculty / Welcome search
- /app/me remains the edit page, but visual language should feel consistent

## Inspiration
docs/prof.png is visual inspiration only.
Use it for layout direction (left profile box, posts below, CTA), but do not invent features not present in our app.

## Scope
UI + component reuse only.
No DB changes, no RLS changes, no routing changes.
Keep click flows intact.

## Requirements
### Profile View (/app/profile/[id]) — NEW premium layout
- Full-width responsive container
- Left column: Profile summary card (bigger avatar, name, role badge, headline, program/grad year if available, skills)
- Right column: Posts area
  - Include "Create post" CTA button linking to /app/feed/new
  - Show user's posts with the same card layout you already have (or temporarily keep existing post rendering, but styled)

### Edit Page (/app/me)
- Keep current edit logic intact
- Ensure the page structure does not feel "totally different" from view (shared header styling + spacing)
- Move posts section (if shown) below skills and align left cleanly (if /app/me currently shows posts)

### Behavior constraints
- /app/profile/[id] is view only (no editing)
- /app/me is edit only
- Directory/Faculty/Search should still link to /app/profile/[id] and that page must be the new design.

## Acceptance
- /app/profile/[id] no longer shows old UI
- Your own profile clicked from Directory/Faculty shows the new view design
- /app/me edit still works and is not broken
- No console errors

---

## Implementation Notes

### Changes Made

**A) `/app/profile/[id]/page.tsx` — Full Redesign**
- Transformed from basic single-column (`max-w-md`) to premium 2-column layout
- Layout: `grid grid-cols-1 lg:grid-cols-[320px_1fr]` — stacks vertically on mobile
- Left column: Profile summary card with xl avatar, name, headline, role badge, program/grad year, skills chips
- Right column: Basic Information card, About card, Posts section with "Create Post" CTA
- Added premium page header with back navigation and contextual buttons (Edit Profile for own profile, Message for others)
- Loading state upgraded to match premium spinner pattern
- Not-found state upgraded with proper card layout
- All data fetching logic preserved exactly (no changes to Supabase queries)
- All handlers preserved: handleDelete, handleReactionToggle, handleMessage
- All PostCard props preserved including isAdmin, canDelete, mediaSize

**B) `/app/me/page.tsx` — Minor Layout Update**
- Added "Create Post" CTA link in the posts section header (next to "My Posts" title)
- Upgraded empty state from plain "No posts yet" to richer empty state with icon, description, and "Create First Post" CTA button
- All edit/save/upload logic untouched
- All form state, refs, handlers preserved exactly

**C) Entry Points Verified**
- Directory (`/app/directory`): Links via `href={/app/profile/${profile.id}}` — no changes needed
- Faculty (`/app/faculty`): Links via `href={/app/profile/${tutor.id}}` — no changes needed
- Welcome search (`/app`): Links via `router.push(/app/profile/${result.id})` — no changes needed
- No alternate routes rendering old profile templates found

### Verification Checklist
- [ ] Open /app/profile/[someUserId] → premium 2-column layout renders with profile card, info cards, posts
- [ ] From directory, click any user → opens premium profile view
- [ ] From faculty, click any tutor → opens premium profile view
- [ ] From welcome search, click a result → premium profile view
- [ ] /app/me still edits and saves successfully (name/headline/skills/avatar)
- [ ] Own profile view shows "Edit Profile" button linking to /app/me
- [ ] Other user's profile shows "Message" button
- [ ] Posts render correctly with reactions and delete functionality
- [ ] Mobile view stacks columns vertically
- [ ] No console errors

### Testing Steps
1. Start dev server: `npm run dev`
2. Log in and navigate to `/app/profile/[your-user-id]` — verify 2-column premium layout
3. Click "Edit Profile" button → should navigate to `/app/me`
4. On `/app/me`, verify edit mode works: change name, headline, skills, avatar
5. Save changes, verify they persist
6. Navigate to `/app/directory`, click a member card → verify premium profile view
7. Navigate to `/app/faculty`, click a tutor card → verify premium profile view
8. On welcome page (`/app`), search for a member, click result → verify premium profile view
9. On another user's profile, click "Message" → verify messaging flow works
10. Test mobile viewport: verify columns stack vertically
11. Check browser console for errors
