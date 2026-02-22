# BRAND-01 — Site title + favicon

## Goal
Replace default "Create Next App" title and favicon with Toronto Academy of Education branding.

## Scope (safe)
- Metadata only + icon asset wiring
- No runtime logic changes

## Changes
1. **`src/app/layout.tsx`** — updated `metadata.title` to `"Toronto Academy of Education"` and `metadata.description` to `"Toronto Academy of Education community platform"`.
2. **`src/app/icon.jpg`** — copied from `public/tae-logo.jpg`. Next.js App Router automatically serves files named `icon.*` in `src/app/` as the favicon, replacing the old `favicon.ico`.

## Verification
1. `npm run build` — should complete without errors.
2. Run dev server (`npm run dev`) and confirm:
   - Tab title shows **"Toronto Academy of Education"**
   - Favicon shows the TAE logo (hard-refresh with Ctrl+Shift+R)
