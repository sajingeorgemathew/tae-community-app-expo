# UI-04.1 Admin Dashboard Redesign (Safe UI Only)

## Goal
Redesign /app/admin to match the modern white/navy theme used across the app.
This is admin-only, but high-risk. UI improvements only.

## Non-negotiable rules
- DO NOT change any Supabase queries, filtering logic, or mutations.
- DO NOT change any role checks / authorization gates.
- DO NOT change selection logic for posts or users.
- DO NOT refactor into new “smart” hooks that risk breaking behavior.
- DO NOT touch PostCard logic or moderation actions beyond styling/wrapping.

## Allowed changes
- Layout: spacing, container width, cards, typography
- Visual styling: buttons, inputs, tables, section headers
- Extract purely presentational components (AdminSectionCard, AdminTableShell)
- Add responsive improvements (but keep same DOM behavior)

## Sections to keep intact
1. Posts Moderation:
   - audience/time filters
   - select all visible
   - delete selected posts
   - post list uses PostCard (do not change that)
2. Tutors:
   - search
   - role dropdown
   - listed checkbox
   - course multi-select
   - save buttons
3. Users Management:
   - search
   - select checkboxes
   - bulk disable
   - bulk delete posts last 24h
   - per-row disable button

## Inspiration
docs/admin-dashboard-*.png are inspiration only.
Blend with existing app theme; do not introduce new features.

## Acceptance checks
- Every existing button behaves the same
- Filters still filter
- Bulk actions still work
- Save works in Tutors section
- No console errors

---

## Implementation Log

### What changed (UI-only, class-level changes in `src/app/app/admin/page.tsx`)

**No logic, queries, mutations, handlers, state, or PostCard props were changed.**

#### Global layout
- Added `bg-gray-50/50` background, `max-w-6xl mx-auto` container, responsive padding `p-6 md:p-8`
- Page title: `text-2xl font-bold text-[#1e293b]` (was `font-semibold`)

#### Loading state
- Added spinner animation and centered layout with subtle text

#### Not Authorized gate
- Wrapped in a card (`rounded-xl border border-gray-200 bg-white shadow-sm`) with icon
- No gate logic changed

#### Posts Moderation section
- Wrapped in `rounded-xl border border-gray-200 bg-white shadow-sm` card
- Section header in card header with `border-b border-gray-100`
- Filter chips: `rounded-full` pills, navy active state (`bg-slate-800 text-white`), label uses uppercase tracking
- Bulk actions bar: `rounded-lg bg-gray-50 border border-gray-100` container
- Delete button: `rounded-lg` with `transition-colors`
- Empty state centered with softer text
- PostCard usage: unchanged (only the wrapping `<li>` got minor checkbox border-radius)

#### Tutors section
- Wrapped in same card pattern
- Search input: navy-focused styling (`focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]/20`)
- Table: `rounded-lg` inner border, `bg-gray-50` header, `divide-y divide-gray-100` rows
- Table headers: `text-xs font-medium text-gray-500 uppercase tracking-wider`
- Role column: read-only roles shown as `rounded-full` badge
- Select dropdown: `rounded-lg` with navy focus ring
- Course chips: `rounded-full bg-blue-50 text-blue-700 border border-blue-200`
- Save Courses button: `bg-emerald-600` (was green-600)
- Save button: `bg-slate-800` navy (was blue-600)
- Status messages: `text-emerald-600` (was green-600)
- Row hover: `hover:bg-gray-50/50 transition-colors`

#### Users Management section
- Same card wrapper pattern
- Same search input styling as Tutors
- Same bulk actions bar pattern
- Table: same header/row styling as Tutors
- Role column: shown as `rounded-full` badge pill
- Status column: Active = `rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200`, Disabled = `rounded-full bg-red-50 text-red-700 border border-red-200`
- Enable button: `bg-emerald-600` (was green-600)
- Disable button: unchanged color (red-600), added `rounded-lg`
- Delete Their Posts button: `bg-amber-600` (was orange-600)

#### CourseDropdown component
- `rounded-lg` border, slightly more padding, `transition-colors` on hover

### Files modified
- `src/app/app/admin/page.tsx` — Tailwind class changes only

### Files NOT modified
- `src/components/PostCard.tsx` — untouched
- No new files created (decided against component extraction to minimize risk)

### Testing checklist
- [ ] Admin role gate still blocks non-admins (check with non-admin account)
- [ ] Posts moderation audience filter works (all/students/alumni)
- [ ] Posts moderation time filter works (1h/2h/3h/24h triggers refetch)
- [ ] Select all visible posts works
- [ ] Delete selected posts works (with confirmation)
- [ ] Single post delete works via PostCard
- [ ] Tutors search filters by name
- [ ] Tutors role dropdown changes value
- [ ] Tutors listed checkbox toggles
- [ ] Tutors Save button saves role + listing changes
- [ ] Tutors course dropdown opens/closes, checkboxes work
- [ ] Tutors Save Courses button saves assignments
- [ ] Users search filters by name/program/year/role
- [ ] Users select all visible works
- [ ] Users individual checkbox works
- [ ] Users per-row Disable/Enable button works
- [ ] Users Bulk Disable works
- [ ] Users Delete Their Posts works
- [ ] No console errors on any interaction
