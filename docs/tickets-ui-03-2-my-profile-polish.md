# UI-03.2 My Profile page polish (View + Edit)

## Goal
Make /app/me feel premium and consistent with the new white/navy theme:
- Clean layout + sections
- Strong avatar block
- Better skills chips UI
- Better save button and form spacing

## Scope
- UI only (layout, styling, minor component extraction)
- Keep existing form logic intact
- No DB changes, no route changes

## Design requirements
- Page header: title + short subtitle
- 2-column layout on desktop:
  - Left: avatar + name + role badge + profile completeness hint (optional)
  - Right: editable form sections
- Sections as cards:
  - Basic Info (full name, program, grad year)
  - Headline/About (headline text)
  - Skills (chip input UI, existing data preserved)
- Primary action button: Save Changes (navy)
- Secondary: Cancel/Back (optional)
- Clear success/error feedback styles

## Implementation Notes

### Files Changed
- `src/components/Avatar.tsx` — Added `xl` size (`w-28 h-28 text-3xl`) for large profile display
- `src/app/app/me/page.tsx` — Full UI redesign (logic preserved)

### Design Decisions
- **Layout**: `grid grid-cols-1 lg:grid-cols-[320px_1fr]` — fixed left column, flexible right
- **Page header**: Sticky top bar with back arrow, title, and action buttons (Edit/Save/Cancel)
- **Left column**: Profile identity card (avatar, name, headline, role badge, program/year) + completeness card + skills (view mode)
- **Right column**: Form cards (Basic Info, About, Skills) in edit mode; info cards in view mode
- **Card styling**: `rounded-xl border border-gray-200 bg-white` matching dashboard cards
- **Section accent bars**: Navy (`bg-slate-800`) for Basic Info, Blue (`bg-blue-600`) for About, Amber (`bg-amber-500`) for Skills — matches dashboard section indicators
- **Input styling**: `rounded-lg border-gray-200 focus:ring-2 focus:ring-blue-500/30` matching dashboard search input
- **Buttons**: Navy primary (`bg-slate-800`), bordered secondary — matching dashboard CTA buttons
- **Avatar edit**: Camera icon overlay on avatar bottom-right corner
- **Skill chips**: Rounded-full pills with inline X button for removal
- **Headline counter**: Live character count (x/160) shown in edit mode
- **Loading spinner**: Animated spin ring matching app theme
- **Empty states**: Icon + text for no-posts state

### Logic Preserved (no changes)
- All state variables, handlers, and refs unchanged
- `computeCompleteness()` function unchanged
- `handleSave()` / `handleCancel()` / `handleEdit()` unchanged
- `handleFileSelect()` validation unchanged
- `addSkill()` / `removeSkill()` unchanged
- `handleDelete()` / `handleReactionToggle()` unchanged
- `useAvatarUrls()` hook usage unchanged
- PostCard integration unchanged

## Acceptance
- [x] All current fields still save correctly
- [x] Avatar upload still works
- [x] Skills still saved as text[] (no schema changes)
- [x] No console errors
- [x] Looks premium and consistent with dashboard and sidebar
- [x] 2-column desktop, stacked mobile
- [x] Edit/Save/Cancel buttons in header
- [x] Loading spinner on save

## Testing Steps

### Manual Verification
1. Navigate to `/app/me` — page loads with 2-column layout on desktop
2. Verify left column shows avatar, name, headline, role badge, program, grad year
3. Verify profile completeness card shows if profile is incomplete
4. Click "Edit Profile" — form cards appear in right column, camera icon on avatar
5. Change full name, headline, program, grad year — fields accept input
6. Add a skill via input + Enter or Add button — chip appears
7. Remove a skill via X button — chip disappears
8. Click "Choose Photo" via camera icon — file picker opens, preview updates
9. Click "Save Changes" — spinner shows, button disabled during save
10. After save — success banner, view mode restored, data persists on refresh
11. Click "Edit Profile" then "Cancel" — form resets to saved values
12. Resize to mobile — layout stacks vertically
13. Test error states: upload oversized file (>5MB), upload non-image file
14. Verify posts section shows posts with reactions, or empty state
