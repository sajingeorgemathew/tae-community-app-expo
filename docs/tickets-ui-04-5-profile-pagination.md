# UI-04.5 — Profile pagination (Phase C2)

## Goal
Reduce initial payload on profile pages by loading 20 posts first, with a "Load more" button using cursor pagination.

Pages:
- /app/me
- /app/profile/[id]

## Constraints
- Do not break existing post features: reactions, comments, delete, media attachments signing, profile links, presence dots.
- Keep current UI styling patterns.
- No schema/RLS changes.

## Implementation plan
1. Change initial posts query limit from 100 → 20.
2. Track cursor: last post `created_at` from the current list.
3. Add `Load more` button:
   - Fetch next 20 posts with `.lt("created_at", cursor)`
   - Append to list
4. Maintain the same secondary fetches:
   - attachments (batched signing via signPostAttachments helper)
   - reactions
   - avatar signing
5. Handle states:
   - loading initial
   - loading more
   - hasMore false when returned < 20

## Manual test checklist
- /app/me loads quickly and shows latest 20 posts.
- Clicking Load more appends more posts (no duplicates).
- Reactions/comments still work on old + newly loaded posts.
- Media still loads (signed URLs).
- Delete still works; deleting a post removes it from UI.
- /app/profile/[id] behaves the same.
- No console errors.

## Commands
- npx tsc --noEmit

