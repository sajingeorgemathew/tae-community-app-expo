# MOBILE-05 — Feed list + Post detail route (read-only)

## Goal
Implement a working Feed experience in the Expo app:
- Feed tab shows list of posts (latest first)
- Each row shows author name + created date + content preview
- Tap a post navigates to PostDetail screen
- Attachments: support image display via signed URL (at least first image)
- Read-only behavior (no create/edit/delete)

## Non-goals
- No New Post screen
- No posting comments/reactions
- No pagination/infinite scroll (limit is fine)
- No realtime/polling

## Files to touch
- apps/mobile/src/navigation/AppTabs.tsx (wire Feed stack)
- apps/mobile/src/navigation/FeedStack.tsx (new)
- apps/mobile/src/screens/FeedScreen.tsx (replace placeholder)
- apps/mobile/src/screens/PostDetailScreen.tsx (new)
- apps/mobile/src/lib/posts.ts (optional helper)
- docs/tickets-mobile-05-feed-post-detail.md (this file)

## Data contract
Use @tae/shared types:
- PostWithAuthor (preferred) OR Post + join author profile
- PostAttachment (if attachments exist)
Use storage helpers from @tae/shared:
- createSignedUrl / createSignedUrlsBatch
- buildPostMediaPath if needed

Bucket assumptions:
- Posts media bucket exists (per EXPO-03 strategy).
- All media is private => signed URLs required.

## Acceptance criteria
- `npm run web:typecheck` passes
- `npx tsc --noEmit` passes in apps/mobile
- Expo app: Feed tab loads posts for signed-in user
- Tapping a post opens PostDetail screen
- If post has an image attachment, it renders (or shows placeholder if missing)

## Manual test steps
1) npm run mobile:start
2) Sign in
3) Open Feed
4) Tap first post -> detail screen
5) Back works