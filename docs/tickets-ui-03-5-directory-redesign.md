# UI-03.5 Directory Page Redesign

## Goal
Redesign /app/directory to match the premium white/navy theme and improve scanning + usability.

## Critical Rule
Preserve existing behavior:
- Search/filter logic (if any)
- Clicking user opens profile page
- "Message" action (if present) still works
- Presence dot logic (if present) still works
- Any pagination or load-more logic remains intact
UI/layout only.

## Inspiration
Use docs/directory.png as visual inspiration only.
Ignore any elements not present in our app.

## Design Requirements
- Page header: "Member Directory" + subtitle
- Search bar styled (rounded, icon, clear button)
- Filters (if already present) styled as pills/selects
- Results displayed as premium user cards:
  - Avatar + presence dot
  - Name + role badge
  - Headline (truncate)
  - Skills chips (wrap, max lines)
  - CTA row:
    - View Profile
    - Message (if available in current page)
- Responsive:
  - Desktop grid (2–3 columns)
  - Mobile stack
- Loading/empty state styled

## Acceptance
- No broken navigation
- No broken message/profile click flows
- No console errors
- Looks consistent with dashboard/sidebar/messages/new post styling

## Implementation Notes

### Changes made (UI-only)
- **Header**: "Member Directory" title (bold, navy) + dynamic subtitle showing member count
- **Search**: Rounded-xl input with search icon (left) and clear "X" button; matches app input styling
- **Cards**: Responsive grid (1 col mobile → 2 cols md → 3 cols lg) with `rounded-xl border shadow-sm hover:shadow-md`
  - Avatar + presence dot (emerald-500, unchanged logic)
  - Name (semibold, navy) + role badge (color-coded: admin=blue, tutor=emerald, member=slate)
  - Headline with `line-clamp-2` or italic "No additional details" placeholder
  - Program + grad year with grad-cap icon
  - Skills chips (max 4 shown, "+N" overflow)
  - CTA row: "View Profile" (outline) + "Message" (navy filled) with spinner on loading
- **Loading state**: Skeleton cards (6) with pulse animation
- **Empty state**: Icon + message + "Clear search" link
- **Suspense fallback**: Spinner + "Loading directory…" text
- Removed "Back to App" link (handled by sidebar navigation)

### Preserved behavior
- All state variables and handlers unchanged
- `handleMessage` still calls `create_conversation_1to1` RPC
- Search filtering logic identical (name, program, year, headline, skills)
- Presence dot logic unchanged (3-min threshold)
- Avatar resolution via `useAvatarUrls` unchanged
- Profile links still go to `/app/profile/[id]`
- No Supabase query changes

### Testing checklist
- [ ] Page loads and shows member cards
- [ ] Search filters by name, program, year, headline, skills
- [ ] Clear button resets search
- [ ] Empty state shows when no results match
- [ ] Clicking card body navigates to `/app/profile/[id]`
- [ ] "View Profile" button navigates to `/app/profile/[id]`
- [ ] "Message" button creates conversation and navigates to `/app/messages?c=<id>`
- [ ] "Message" button shows spinner while loading
- [ ] "Message" button hidden for own profile
- [ ] Presence dots (green) show for online users
- [ ] Skeleton loading state shows on initial load
- [ ] Responsive: 1 col on mobile, 2 on md, 3 on lg
- [ ] No console errors
