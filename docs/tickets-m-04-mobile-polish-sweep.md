# M-04 — Mobile polish sweep (CSS-only)

## Goal
Fix minor mobile issues across the app:
- overflow / horizontal scrolling
- text wrapping / button label wrapping
- tap targets on small screens
- responsive spacing for headers, pills, toolbars
- tables: prevent layout breaking on small screens (use scroll)

## Rules (safety)
- Styling only (Tailwind classes and/or small global CSS utilities)
- No Supabase query changes
- No routing changes
- No logic/state changes except absolutely necessary for layout (prefer none)
- Desktop must remain unchanged visually

## Changes made

### `src/app/app/page.tsx` (Dashboard)
- Outer padding `p-6 md:p-8` → `p-4 md:p-8` (saves 16px on mobile)
- Hero banner `px-8 py-10` → `px-5 py-8 md:px-8 md:py-10`
- Hero buttons `flex gap-3` → `flex flex-col sm:flex-row gap-3` (stack on mobile)
- Search result row: added `min-w-0` for overflow safety
- Search result name: added `truncate`

### `src/app/app/feed/page.tsx` (Feed)
- Controls bar `px-6` → `px-4` on mobile
- Filters row: added `flex-wrap` and `gap-y-2` for narrow screens
- Posts container `px-6 py-6` → `px-4 py-4 md:px-8 md:py-6`

### `src/components/PostCard.tsx`
- Content `<p>`: added `break-words` for long URLs
- Feed image: `max-w-[520px]` → `max-w-full sm:max-w-[520px]`
- Feed video: `max-w-[640px]` → `max-w-full sm:max-w-[640px]`
- Reactions row: added `gap-2`
- Comment input flex: `gap-3` → `gap-2 sm:gap-3`
- "Post Comment" button: wrapped text with `whitespace-nowrap`

### `src/components/StatCard.tsx`
- First child div: added `min-w-0` for truncation safety
- Value text: added `truncate`

### `src/app/app/me/page.tsx` (My Profile)
- Header padding: `px-6 py-5` → `px-4 py-4 md:px-8 md:py-5`
- Header flex: stack on mobile with `flex-col sm:flex-row`
- Button gap: `gap-3` → `gap-2 sm:gap-3`
- View mode grid: `gap-x-8` → `gap-x-4 sm:gap-x-8`

### `src/app/app/profile/[id]/page.tsx`
- Header padding: `px-6 py-5` → `px-4 py-4 md:px-8 md:py-5`
- Header flex: stack on mobile with `flex-col sm:flex-row`

### `src/app/app/directory/page.tsx`
- Outer padding: `p-6` → `p-4` on mobile
- CTA row: `flex` → `flex flex-col sm:flex-row` (stack buttons)

### `src/app/app/faculty/page.tsx`
- Card grid gap: `gap-6` → `gap-4 md:gap-6`
- CTA row: `flex` → `flex flex-col sm:flex-row` (stack buttons)

### `src/app/app/questions/page.tsx`
- Outer padding: `p-6` → `p-4` on mobile
- Header: stack title + "Ask" button with `flex-col sm:flex-row`

### `src/app/app/admin/page.tsx`
- Outer padding: `p-6` → `p-4` on mobile
- Tutors table: added `min-w-[700px]` for horizontal scroll
- Users table: added `min-w-[700px]` for horizontal scroll

## Deferred items
- `src/app/app/feed/new/page.tsx` — already well-structured (`max-w-2xl`, responsive `p-5 md:p-6`), no changes needed
- `src/app/app/messages/page.tsx` — already reworked in M-03, no issues found
- MobileBottomNav `w-44` dropdown — fits fine on 320px+ screens, not a real overflow risk

## Verification
- `npx tsc --noEmit` — passes
- `npm run build` — passes
- Manual check: resize browser to 320px and 390px, verify no horizontal scroll on any page
