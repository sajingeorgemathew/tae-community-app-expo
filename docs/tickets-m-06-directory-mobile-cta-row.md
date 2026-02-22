# M-06 — Directory card CTA row (mobile-only)

## Goal
On mobile, keep "View Profile" + "Message" buttons side-by-side (2-up) instead of stacked, while preserving desktop layout.

## Scope (safe)
- Only CSS/className changes
- Only src/app/app/directory/page.tsx
- No logic, routing, or Supabase changes

## What changed
- **CTA row container** (line 349): replaced `flex flex-col sm:flex-row` with `grid grid-cols-2 sm:flex sm:flex-row`.
  - Mobile (`< sm`): CSS Grid with 2 equal-width columns keeps both buttons side-by-side.
  - Desktop (`sm+`): `sm:flex sm:flex-row` restores the original flex layout — no visual change.

## Verification
- `npx tsc --noEmit` — passes
- `npm run build` — passes
- Manual: iPhone/Android widths (360, 390, 430 px) — CTAs remain 2-up, equal width
- Manual: Desktop — card layout unchanged
