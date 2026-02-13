# Ticket 49 — Q&A list reply previews (RPC feed)

## Goal
Improve /app/questions list UX by showing reply count and latest reply preview.

## Changes
### DB (RPC)
Add `public.get_questions_feed(limit_count int default 30)` which returns:
- question: id, title, body, created_at, author_id
- author: author_name, author_avatar_path
- stats: answer_count, latest_answer_at
- latest reply preview:
  - latest_replier_id, latest_replier_name, latest_replier_avatar_path, latest_replier_role

Rules:
- Read-only function (SELECT only)
- Works with existing RLS (authenticated users can read questions/answers/profiles)
- No SECURITY DEFINER required.

### UI
Update `/app/questions` to call the RPC and render:
- "No replies yet"
- "1 reply • Replied by {Name}" (+ badge if tutor/admin)
- "{N} replies • Latest: {Name} + {N-1} more" (+ badge)

## Non-goals
- No faculty embedding
- No votes/accepted answer
- No change to /app/questions/[id]

## Implementation Notes

### Migration
- File: `supabase/migrations/20250214_ticket49_get_questions_feed.sql`
- Plain SQL `STABLE` function, no SECURITY DEFINER
- Uses `LEFT JOIN LATERAL` for answer stats and latest replier to preserve questions with 0 answers
- Schema-qualified references: `public.questions`, `public.answers`, `public.profiles`

### UI
- File: `src/app/app/questions/page.tsx`
- Replaced direct `.from("questions").select(...)` with `.rpc("get_questions_feed", { limit_count: 30 })`
- Resolves avatar signed URLs for both question authors and latest repliers via `useAvatarUrls`
- Reply preview line rendered below the question metadata
- Tutor/admin badge: small blue chip with capitalized role text

## Testing

### Prerequisites
- Run the migration against local Supabase: `supabase db reset` or apply migration manually
- Have at least one user with role='tutor' or role='admin' for badge testing

### Test Cases
1. **0 questions** — page shows "No questions yet. Be the first to ask!"
2. **Question with 0 replies** — shows "No replies yet" in italic
3. **Question with 1 reply from a tutor** — shows "1 reply · Replied by {Name}" with blue "tutor" badge
4. **Question with 1 reply from a regular user** — shows "1 reply · Replied by {Name}" with no badge
5. **Question with 3+ replies, latest by admin** — shows "{N} replies · Latest: {Name}" with "admin" badge and "+ {N-1} more"
6. **Ask a Question form** — still works: creates question, list refreshes, new question appears with 0 replies
7. **Click question link** — navigates to /app/questions/[id] (unchanged page)
8. **RPC directly** — `select * from public.get_questions_feed(5);` returns expected columns, questions with no answers have NULL latest_replier_* and answer_count=0
