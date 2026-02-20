# UI-04.3 — Lazy media loading (safe UX/perf)

## Goal
Improve perceived load time on Feed/Profile/Admin where posts contain images/videos by enabling browser-native lazy loading and lightweight preloading.

## Constraints (must keep safe)
- Do NOT change Supabase queries, polling, comment/reaction logic, or routes
- Do NOT change DB, RLS, or storage policies
- Only touch rendering attributes on media elements
- Must not break existing attachments rendering

## Changes
- For images: add `loading="lazy"` and `decoding="async"`
- For videos: add `preload="metadata"` and `playsInline`
- (Optional safe) add `poster` if available later (not required)

## Files
- src/components/PostCard.tsx (primary)
- (Optional) small CSS class adjustments if needed (but prefer none)

## Test Plan
- Load /app/feed and verify posts show
- Image attachments still appear
- Video attachments still play when clicked
- Comments/reactions unchanged
- Verify in DevTools network that videos no longer fully download on initial render (should fetch metadata first)
- Run:
  - npx tsc --noEmit

---

## Implementation Log

### Changes made (PostCard.tsx)
1. **`<img>` elements** (line ~297): added `loading="lazy"` and `decoding="async"`
2. **`<video>` elements** (line ~312): added `preload="metadata"` and `playsInline`

No other files changed. No logic, queries, or styling modified.

### Test evidence
- `npx tsc --noEmit` — passed with zero errors

### Manual verification steps
1. Open `/app/feed` — confirm posts with images render correctly and appear as you scroll
2. Open DevTools > Network tab — images below the fold should load on scroll (lazy), not all at once
3. Videos should show a poster frame (metadata) without downloading the full file until play is clicked
4. Comments, reactions, delete menu — all unchanged and functional
