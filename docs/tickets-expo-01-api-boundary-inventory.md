# EXPO-01 — API boundary inventory (Supabase contract map)

## Goal
Produce a single source-of-truth inventory of all Supabase usage in the current web app so the Expo rewrite can reuse the same backend contract safely.

## Scope (apps/web only)
Capture:
- Every `.from('<table>')` call:
  - table name
  - operation(s): select/insert/update/delete/upsert
  - file path(s) where used
- Every `.rpc('<fn>')` call:
  - function name
  - file path(s) where used
  - args shape (best-effort)
- Storage usage:
  - bucket names
  - upload/read/delete patterns
  - path conventions (e.g., `messages/<conversationId>/...`)
  - any policy assumptions (membership/ownership)
- Special logic:
  - presence/heartbeats/realtime channels
  - SSR vs client differences (createBrowserClient/createServerClient)

## Non-goals
- No code refactors
- No behavior changes
- No schema/policy changes

## Deliverable
Create: `docs/contracts/supabase-contract.md`
This doc must be complete enough to build the Expo app without rediscovering backend logic.

## Acceptance criteria
- Doc lists all tables, RPCs, buckets used by apps/web
- Includes file paths for every entry
- Notes any assumptions (RLS, membership checks, signed URLs)
- Mentions presence heartbeat logic if present

---

## Implementation Log

**Date:** 2026-02-26
**Deliverable:** `docs/contracts/supabase-contract.md`

### Files scanned (18 files)

| # | File |
|---|------|
| 1 | `src/middleware.ts` |
| 2 | `src/lib/supabaseClient.ts` |
| 3 | `src/lib/supabaseServer.ts` |
| 4 | `src/lib/avatarUrl.ts` |
| 5 | `src/lib/signPostAttachments.ts` |
| 6 | `src/lib/AppMetricsContext.tsx` |
| 7 | `src/lib/usePresenceHeartbeat.ts` |
| 8 | `src/components/AppSidebar.tsx` |
| 9 | `src/components/PostCard.tsx` |
| 10 | `src/components/PresenceProvider.tsx` |
| 11 | `src/app/login/page.tsx` |
| 12 | `src/app/signup/page.tsx` |
| 13 | `src/app/app/page.tsx` |
| 14 | `src/app/app/layout.tsx` |
| 15 | `src/app/app/feed/page.tsx` |
| 16 | `src/app/app/feed/new/page.tsx` |
| 17 | `src/app/app/me/page.tsx` |
| 18 | `src/app/app/directory/page.tsx` |
| 19 | `src/app/app/faculty/page.tsx` |
| 20 | `src/app/app/admin/page.tsx` |
| 21 | `src/app/app/messages/page.tsx` |
| 22 | `src/app/app/questions/page.tsx` |
| 23 | `src/app/app/questions/[id]/page.tsx` |
| 24 | `src/app/app/profile/[id]/page.tsx` |

### Summary counts

| Category | Count |
|----------|-------|
| Tables | 14 |
| RPC functions | 4 |
| Storage buckets | 3 |
| Auth client patterns | 2 (browser + server/middleware) |

### Tables found
`profiles`, `posts`, `post_attachments`, `post_reactions`, `post_comments`, `messages`, `message_attachments`, `conversation_reads`, `conversation_deliveries`, `presence`, `questions`, `answers`, `qa_activity_reads`, `courses`, `tutor_course_assignments`

### RPCs found
`get_my_conversations`, `get_questions_feed`, `create_conversation_1to1`, `get_conversation_read_state`

### Storage buckets found
`profile-avatars`, `post-media`, `message-media`

### Surprises / risks

1. **No Supabase Realtime usage at all** — messaging and all live features use HTTP polling (3–8 second intervals). This is the biggest architectural gap for Expo (battery drain).
2. **Presence is DB-based** — custom `presence` table with upsert heartbeats, not Supabase Realtime presence channels. This is portable to Expo but uses browser-specific APIs (`document.visibilityState`, `window.focus`) that need React Native equivalents.
3. **Middleware auth** — `createServerClient` is only used in Next.js middleware for route protection and disabled-user checks. Expo has no middleware; these guards must move to navigation-level checks.
4. **Aggressive polling** — `AppMetricsContext` polls every 8s, messages every 3s. Will cause battery drain on mobile without redesign.
5. **File uploads use web `File` API** — Expo will need `expo-image-picker` / `expo-document-picker` with Blob conversion.
6. **15 tables total** — the `courses` and `tutor_course_assignments` tables are only used in faculty/admin views; Expo MVP could defer these if scoping down.