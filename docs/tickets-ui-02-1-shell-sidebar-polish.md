# UI-02.1 Shell width + Sidebar polish

## Goals
1) Fix dashboard/content width so it doesn't feel boxed with huge side gaps.
2) Redesign sidebar to match white/navy modern SaaS theme.
3) Add TAE logo from /public/tae-logo.jpg at top of sidebar.

## Scope
- UI only: layout + sidebar + spacing/tokens
- No DB changes
- No route changes

## Acceptance
- Main content uses a wider max width (looks balanced on desktop)
- Sidebar looks premium and consistent with dashboard
- Logo renders correctly

## Implementation Steps
1. **layout.tsx** - Added `bg-gray-50` to shell, wrapped main with `max-w-7xl mx-auto` for wider desktop content.
2. **Dashboard page.tsx** - Removed redundant `max-w-5xl mx-auto` (layout now handles max-width).
3. **AppSidebar.tsx** - Full redesign:
   - Added TAE logo at top using `next/image` with `/tae-logo.jpg`.
   - Widened sidebar from `w-56` to `w-60` for better proportions.
   - White background with `border-r` separator.
   - Navy active state (`bg-slate-900 text-white`) with rounded-lg.
   - Subtle hover (`hover:bg-gray-100`) on inactive items.
   - Badge color inverts on active items for contrast.
   - Proper spacing with dividers between logo/nav/logout sections.
   - All link targets and badge logic preserved unchanged.

## Test Steps
1. Navigate to `/app` - verify dashboard content fills wider area, no excessive side gaps.
2. Check sidebar logo renders at top (TAE logo, 36x36, rounded).
3. Click each sidebar link - verify active state shows navy bg with white text.
4. Hover inactive links - verify subtle gray hover effect.
5. Verify badges (Messages, Questions) display correctly, inverting color on active.
6. Verify Admin Dashboard link shows for admin users, with red text styling.
7. Verify Log Out button works and redirects to `/login`.
8. Resize browser to < 768px - sidebar should be hidden (desktop-first).
9. Check all link targets remain identical (no route changes).
