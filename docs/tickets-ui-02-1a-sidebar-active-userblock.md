# UI-02.1a Sidebar active-state fix + user block

## Issues
1) On /app/messages, both "My Profile" and "Messages" show active styling.
2) Add user identity block (avatar + name/role) at bottom of sidebar near Logout.

## Goals
- Only the correct nav item is active.
- Add a bottom user block with current user's avatar and name.
- Keep routes and behavior unchanged (UI-only).

## Acceptance
- Visiting /app/me only highlights My Profile
- Visiting /app/messages only highlights Messages
- Other routes highlight correctly
- User block renders with signed avatar URL (same logic as elsewhere)

## Implementation Notes

### Active-state fix
- Root cause: `pathname.startsWith("/app/me")` matched both `/app/me` and `/app/messages`
- Fix: Added `exact` flag to links needing exact match (Dashboard `/app`, My Profile `/app/me`)
- Non-exact links now use `pathname === href || pathname.startsWith(href + "/")` (trailing slash) to prevent partial prefix collisions
- Feed link uses `href: "/app/feed"` for matching but `linkTo: "/app/feed/new"` for navigation, so both `/app/feed` and `/app/feed/new` highlight correctly

### User block
- Fetches `full_name`, `avatar_path`, and `role` in the existing `loadSidebarData()` effect (no extra request)
- Uses `useAvatarUrls().getAvatarUrl()` for signed avatar URL (same cache pattern as all pages)
- Renders with existing `<Avatar>` component (sm size, initials fallback)
- Positioned above Logout, below nav links

### Files changed
- `src/components/AppSidebar.tsx` — active-state logic + user block

## Test Steps
1. Navigate to `/app` — only Dashboard is highlighted
2. Navigate to `/app/me` — only My Profile is highlighted
3. Navigate to `/app/messages` — only Messages is highlighted (NOT My Profile)
4. Navigate to `/app/messages/[some-id]` — Messages still highlighted
5. Navigate to `/app/feed/new` — New Post is highlighted
6. Navigate to `/app/questions` — Questions is highlighted
7. Navigate to `/app/questions/[id]` — Questions still highlighted
8. Navigate to `/app/directory` — only Directory highlighted
9. Navigate to `/app/faculty` — only Faculty highlighted
10. Navigate to `/app/admin` (as admin) — only Admin Dashboard highlighted
11. Verify user block at bottom shows avatar (or initials), full name, and role
12. Verify user with no avatar shows initials fallback
13. Verify Logout button still works
14. Verify sidebar layout looks consistent on different viewport heights
