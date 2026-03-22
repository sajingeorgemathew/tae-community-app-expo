# MOBILE-16B2 — Feed media preview fitting + full-view behavior

## Goal
Improve how post media is displayed in the mobile Feed and Post Detail screens:
- make media previews fit better in feed cards
- support a full-view screen/modal for images when tapped
- reduce unstable/shuffling/disappearing preview behavior where possible

## Why
The current feed media rendering works but still feels rough:
- banners, portrait photos, and square images are not handled consistently
- previews can feel overly cropped
- some images appear unstable / seem to disappear or shuffle in feed cards
- users need a clear way to view the full image

This ticket improves media behavior before reactions/comments work is added.

## Scope
This ticket should cover:
1) Better feed media preview container behavior
2) Better post detail media rendering
3) Add a full-image viewer screen or modal for tapped images
4) Make image preview behavior more stable and predictable

## Explicitly included
- Improve feed card image rendering for mixed aspect ratios
- Add a tap-to-open full-view media route or modal
- Keep rendering safe for:
  - banner-like images
  - portrait images
  - square images
- Reduce image instability/shuffling behavior if caused by current preview implementation

## Explicitly NOT included
- No video playback UX beyond safe placeholder if already present
- No carousel/gallery redesign for multiple media items unless trivial
- No reactions create flow
- No comments create flow
- No post owner edit/delete
- No final design polish/theming pass

## Important implementation note
Claude should inspect the current feed/post-detail media rendering and identify why previews feel unstable:
- image cache behavior
- signed URL refresh timing
- aspect-ratio/layout recalculation
- key/render strategy in FlatList
- container sizing logic

Fix the most impactful causes without overengineering.

## Existing context
Already working:
- Feed list
- Post detail
- signed URL helpers for post attachments
- new post
- feed filter parity
- mobile card rendering

## Expected behavior
### Feed cards
- media previews render in a more stable container
- portrait, square, and wide images look reasonable
- tapping an image opens a full-view screen/modal

### Post detail
- media renders more predictably
- tapping image shows full view if appropriate

### Full-view behavior
- user can inspect the full image more clearly than in the feed card
- back/dismiss works cleanly

## Technical constraints
- Do NOT change apps/web
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse existing attachment/query logic where practical
- Keep UI simple and stable
- Avoid overbuilding a full gallery system in this ticket

## Files likely to touch
- apps/mobile/src/screens/FeedScreen.tsx
- apps/mobile/src/screens/PostDetailScreen.tsx
- apps/mobile/src/screens/ImageViewerScreen.tsx or a modal component (new)
- apps/mobile/src/components/* (optional media preview component)
- docs/tickets-mobile-16b2-feed-media-fitting.md

## Acceptance criteria
- Feed media previews fit better across different aspect ratios
- Tapping an image opens a full-view image experience
- Post detail media rendering remains stable
- Existing feed/post flows still work
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Sign in
2) Open Feed
3) Verify mixed media posts look better in preview
4) Tap an image in Feed
5) Verify full-view screen/modal opens
6) Open Post Detail
7) Verify image behavior remains stable
8) Confirm back/dismiss works