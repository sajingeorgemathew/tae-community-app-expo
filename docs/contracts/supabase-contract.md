# Supabase Contract Map — TAE Community App

> Generated: 2026-02-26 | Ticket: EXPO-01
> Scope: `apps/web/` only (Next.js web app)

---

## Overview

The TAE Community web app uses Supabase for:
- **Auth** — email/password sign-up and sign-in (`@supabase/ssr`)
- **Database** — 14 tables via PostgREST (`.from()`)
- **RPC** — 4 Postgres functions (`.rpc()`)
- **Storage** — 3 buckets for media and avatars
- **Presence** — custom heartbeat via `presence` table (NOT Supabase Realtime channels)

Client instantiation:
| Pattern | File | Usage |
|---------|------|-------|
| `createBrowserClient` | `src/lib/supabaseClient.ts` | Singleton; used in all client components |
| `createServerClient` | `src/lib/supabaseServer.ts` | Middleware only; cookie-based session refresh |

---

## Tables

### `profiles`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **select** | `src/middleware.ts:29` | Check `is_disabled`, `role` for route protection |
| **select** | `src/components/AppSidebar.tsx:42` | Fetch `role, full_name, avatar_path` for sidebar |
| **select** | `src/app/login/page.tsx:35` | Check if profile exists after sign-in |
| **select** | `src/app/app/page.tsx:155` | Profile completeness check (dashboard) |
| **select** | `src/app/app/page.tsx:297` | Quick-search members by name/program |
| **select** | `src/app/app/me/page.tsx:135` | Load full profile for editing |
| **select** | `src/app/app/feed/page.tsx:109` | Check admin role |
| **select** | `src/app/app/directory/page.tsx:86` | Load all profiles for directory listing |
| **select** | `src/app/app/faculty/page.tsx:79` | Load tutors (`role=tutor`, `is_listed_as_tutor=true`) |
| **select** | `src/app/app/admin/page.tsx:146, 255, 410` | Admin: user list with pagination |
| **select** | `src/app/app/profile/[id]/page.tsx:94, 105` | View other user's profile |
| **select** | `src/app/app/questions/[id]/page.tsx:112` | Fetch author role for question detail |
| **select** | `src/lib/AppMetricsContext.tsx:59` | Fetch `created_at` for Q&A baseline |
| **insert** | `src/app/login/page.tsx:42` | Create profile row on first login |
| **upsert** | `src/app/signup/page.tsx:39` | Create/update profile on signup (`onConflict: "id"`) |
| **update** | `src/app/app/me/page.tsx:423` | Save profile edits |
| **update** | `src/app/app/admin/page.tsx:714` | Toggle `is_disabled` |
| **update** | `src/app/app/admin/page.tsx:754` | Bulk disable users |
| **update** | `src/app/app/admin/page.tsx:882` | Update `role`, `is_listed_as_tutor` |

**Columns used:** `id, full_name, program, grad_year, role, avatar_path, headline, skills, current_work, qualifications, experience, is_disabled, is_listed_as_tutor, created_at`

---

### `posts`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **select** | `src/app/app/feed/page.tsx:124, 256` | Feed listing with cursor pagination |
| **select** | `src/app/app/me/page.tsx:172, 250` | User's own posts |
| **select** | `src/app/app/profile/[id]/page.tsx:127, 205` | Other user's posts |
| **select** | `src/app/app/admin/page.tsx:169, 302, 619` | Admin post moderation |
| **select** | `src/app/app/page.tsx:183` | Dashboard recent posts (limit 3) |
| **insert** | `src/app/app/feed/new/page.tsx:175` | Create new post |
| **delete** | `src/app/app/feed/page.tsx:391` | Delete own post |
| **delete** | `src/app/app/me/page.tsx:486` | Delete own post (profile view) |
| **delete** | `src/app/app/profile/[id]/page.tsx:298` | Delete post (admin) |
| **delete** | `src/app/app/admin/page.tsx:541` | Admin delete post |

**Columns used:** `id, author_id, content, audience, created_at`
**Joins:** `profiles(full_name, avatar_path)` via foreign key

---

### `post_attachments`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **select** | `src/app/app/feed/page.tsx:144, 277, 370` | Fetch & cleanup attachments |
| **select** | `src/app/app/me/page.tsx:186, 266, 466` | Fetch & cleanup attachments |
| **select** | `src/app/app/profile/[id]/page.tsx:141, 221, 278` | Fetch & cleanup attachments |
| **select** | `src/app/app/admin/page.tsx:188, 337, 523` | Fetch & cleanup attachments |
| **insert** | `src/app/app/feed/new/page.tsx:275` | Attach media to new post |

**Columns used:** `id, post_id, type, storage_path, url`

---

### `post_reactions`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **select** | `src/app/app/feed/page.tsx:155, 288` | Load reactions for posts |
| **select** | `src/app/app/me/page.tsx:197, 274` | Load reactions for posts |
| **select** | `src/app/app/profile/[id]/page.tsx:152, 229` | Load reactions for posts |
| **select** | `src/app/app/admin/page.tsx:199, 348` | Load reactions for posts |
| **insert** | `src/app/app/feed/page.tsx:441` | Add emoji reaction |
| **insert** | `src/app/app/me/page.tsx:536` | Add emoji reaction |
| **insert** | `src/app/app/profile/[id]/page.tsx:348` | Add emoji reaction |
| **insert** | `src/app/app/admin/page.tsx:685` | Add emoji reaction |
| **delete** | `src/app/app/feed/page.tsx:413` | Remove emoji reaction |
| **delete** | `src/app/app/me/page.tsx:508` | Remove emoji reaction |
| **delete** | `src/app/app/profile/[id]/page.tsx:320` | Remove emoji reaction |
| **delete** | `src/app/app/admin/page.tsx:658` | Remove emoji reaction |

**Columns used:** `post_id, user_id, emoji`

---

### `post_comments`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **select** | `src/components/PostCard.tsx:93` | Fetch comments for post |
| **insert** | `src/components/PostCard.tsx:140` | Add comment |
| **update** | `src/components/PostCard.tsx:172` | Edit comment |
| **delete** | `src/components/PostCard.tsx:193` | Delete comment |

**Columns used:** `id, post_id, author_id, content, created_at, updated_at, profiles(full_name, avatar_path)`

---

### `messages`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **select** | `src/app/app/messages/page.tsx:593` | Load messages for conversation (with nested `message_attachments`) |
| **insert** | `src/app/app/messages/page.tsx:865` | Send message |
| **update** | `src/app/app/messages/page.tsx:965` | Edit message content |
| **delete** | `src/app/app/messages/page.tsx:992` | Delete message |

**Columns used:** `id, conversation_id, sender_id, content, created_at, updated_at`
**Joins:** `message_attachments(id, type, storage_path, mime_type)` via nested select

---

### `message_attachments`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **insert** | `src/app/app/messages/page.tsx:904` | Attach file to message |

**Columns used:** `id, message_id, type, storage_path, mime_type, size_bytes`

---

### `conversation_reads`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **upsert** | `src/app/app/messages/page.tsx:447` | Mark conversation as read (`onConflict: "conversation_id,user_id"`) |

**Columns used:** `conversation_id, user_id, last_read_at`

---

### `conversation_deliveries`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **upsert** | `src/app/app/messages/page.tsx:485` | Record delivery timestamp (`onConflict: "conversation_id,user_id"`) |
| **select** | `src/app/app/messages/page.tsx:501` | Check partner's last delivery time |

**Columns used:** `conversation_id, user_id, last_delivered_at`

---

### `presence`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **upsert** | `src/lib/usePresenceHeartbeat.ts:15` | Heartbeat upsert every 45s (`onConflict: "user_id"`) |
| **select** | `src/lib/AppMetricsContext.tsx:57` | Count online members (3-min threshold) |
| **select** | `src/app/app/directory/page.tsx:109` | Show online dots in directory |
| **select** | `src/app/app/faculty/page.tsx:104` | Show online dots for tutors |
| **select** | `src/app/app/messages/page.tsx:569` | Show online status of chat partner |
| **select** | `src/app/app/questions/page.tsx:91` | Show online dots for question authors |
| **select** | `src/app/app/questions/[id]/page.tsx:179` | Show online dots in question detail |

**Columns used:** `user_id, last_seen_at`

---

### `questions`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **select** | `src/lib/AppMetricsContext.tsx:94` | Count new questions since last Q&A read |
| **select** | `src/app/app/questions/[id]/page.tsx:123` | Load question detail with author join |
| **insert** | `src/app/app/questions/page.tsx:161` | Create new question |

**Columns used:** `id, title, body, author_id, created_at`
**Joins:** `profiles!questions_author_id_fkey(full_name, avatar_path)`

---

### `answers`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **select** | `src/lib/AppMetricsContext.tsx:98` | Count new answers since last Q&A read |
| **select** | `src/app/app/questions/[id]/page.tsx:65` | Load answers for question |
| **insert** | `src/app/app/questions/[id]/page.tsx:201` | Post answer to question |

**Columns used:** `id, question_id, body, author_id, created_at`
**Joins:** `profiles!answers_author_id_fkey(full_name, avatar_path)`

---

### `qa_activity_reads`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **select** | `src/lib/AppMetricsContext.tsx:53` | Get user's last Q&A visit time |
| **upsert** | `src/app/app/questions/page.tsx:139` | Update last Q&A visit (`onConflict: "user_id"`) |

**Columns used:** `user_id, last_seen_at`

---

### `courses`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **select** | `src/app/app/faculty/page.tsx:122` | List active courses for filter |
| **select** | `src/app/app/admin/page.tsx:461` | List active courses for tutor assignment |

**Columns used:** `id, code, title, is_active`

---

### `tutor_course_assignments`

| Operation | Files | Purpose |
|-----------|-------|---------|
| **select** | `src/app/app/faculty/page.tsx:135` | Load tutor-course mappings (with course join) |
| **select** | `src/app/app/admin/page.tsx:476` | Load all assignments |
| **upsert** | `src/app/app/admin/page.tsx:973` | Assign courses to tutor (`onConflict: "tutor_id,course_id"`) |
| **delete** | `src/app/app/admin/page.tsx:983` | Remove course assignments |

**Columns used:** `tutor_id, course_id`
**Joins:** `courses(code, title)` on faculty page

---

## RPC Functions

### `get_my_conversations`

| File | Args | Returns |
|------|------|---------|
| `src/lib/AppMetricsContext.tsx:51` | _(none)_ | `{ conversation_id, other_user_id, other_user_name, other_user_avatar_path, last_message_content, last_message_at, unread_count, is_unread }[]` |
| `src/app/app/messages/page.tsx:525, 622` | _(none)_ | Same as above |

**Purpose:** Returns all conversations for the authenticated user with unread counts and last message preview. Core to messaging sidebar and unread badge counts.

---

### `get_questions_feed`

| File | Args | Returns |
|------|------|---------|
| `src/app/app/questions/page.tsx:58` | `{ limit_count: number }` (30) | Questions feed rows |
| `src/app/app/page.tsx:222` | `{ limit_count: number }` (3) | Dashboard preview |

**Purpose:** Returns questions with metadata, ordered for feed display.

---

### `create_conversation_1to1`

| File | Args | Returns |
|------|------|---------|
| `src/app/app/directory/page.tsx:151` | `{ other_user_id: string }` | `conversation_id` |
| `src/app/app/faculty/page.tsx:193` | `{ other_user_id: string }` | `conversation_id` |
| `src/app/app/profile/[id]/page.tsx:378` | `{ other_user_id: string }` | `conversation_id` |

**Purpose:** Creates (or returns existing) 1-to-1 conversation between current user and target. Idempotent.

---

### `get_conversation_read_state`

| File | Args | Returns |
|------|------|---------|
| `src/app/app/messages/page.tsx:499` | `{ conv_id: string }` | `{ other_last_read_at: string }` |

**Purpose:** Returns the other participant's last read timestamp for read-receipt ticks.

---

## Storage Buckets

### `profile-avatars`

| Operation | File | Details |
|-----------|------|---------|
| **upload** | `src/app/app/me/page.tsx:392` | Path: `{userId}/{uuid}.{ext}`, `upsert: true` |
| **remove** | `src/app/app/me/page.tsx:404` | Removes old avatar before uploading new one |
| **createSignedUrl** | `src/lib/avatarUrl.ts:17, 46` | 1-hour expiry, client-side cache (useRef Map) |

**Path convention:** `{userId}/{filename}`
**Policy assumption:** User can upload to their own `{userId}/` prefix. Signed URLs used for reads (bucket is not public).

---

### `post-media`

| Operation | File | Details |
|-----------|------|---------|
| **upload** | `src/app/app/feed/new/page.tsx:211, 240` | Path: `{userId}/{postId}/{uuid}.{ext}`, `upsert: false` |
| **remove** | `src/app/app/feed/page.tsx:381` | Cleanup on post delete |
| **remove** | `src/app/app/me/page.tsx:477` | Cleanup on post delete |
| **remove** | `src/app/app/profile/[id]/page.tsx:289` | Cleanup on post delete (admin) |
| **remove** | `src/app/app/admin/page.tsx:533` | Admin cleanup on post delete |
| **createSignedUrls** | `src/lib/signPostAttachments.ts:39` | Batch signing, 1-hour expiry |

**Path convention:** `{userId}/{postId}/{uuid}.{ext}`
**Policy assumption:** User can upload/delete within their own `{userId}/` prefix. Admins can delete any path. Signed URLs for reads.

---

### `message-media`

| Operation | File | Details |
|-----------|------|---------|
| **upload** | `src/app/app/messages/page.tsx:895` | Path: `messages/{conversationId}/{messageId}/{uuid}.{ext}` |
| **createSignedUrl** | `src/app/app/messages/page.tsx:641, 920` | 1-hour expiry, per-attachment |

**Path convention:** `messages/{conversationId}/{messageId}/{uuid}.{ext}`
**Policy assumption:** Conversation members can upload/read within their conversation path. Signed URLs for reads.

---

## Realtime / Presence / Heartbeats

### Presence Heartbeat (custom, NOT Supabase Realtime)

| File | Details |
|------|---------|
| `src/lib/usePresenceHeartbeat.ts` | Upserts to `presence` table every 45 seconds |
| `src/components/PresenceProvider.tsx` | Wraps `usePresenceHeartbeat()`, mounted in app layout |
| `src/app/app/layout.tsx` | Renders `<PresenceProvider />` at app shell level |

**Mechanism:**
- Upserts `{ user_id, last_seen_at }` to `presence` table on mount, every 45s, on tab focus, and on visibility change.
- Consumers query `presence` table and apply a 3-minute threshold to determine "online" status.
- **No Supabase Realtime channels, no WebSocket subscriptions, no `supabase.channel()` calls found.**

### Polling (NOT Realtime)

| Feature | Interval | File |
|---------|----------|------|
| App metrics (unread msgs, Q&A badge, online count) | 8 seconds | `src/lib/AppMetricsContext.tsx` |
| Conversations list | 6 seconds | `src/app/app/messages/page.tsx` |
| Messages in active thread | 3 seconds | `src/app/app/messages/page.tsx` |

**Expo risk:** Polling intervals will need adjustment for mobile (battery drain). Consider push notifications or Supabase Realtime channels as replacements.

---

## Auth / Session Pattern Notes

### Client-side (`createBrowserClient`)

- **File:** `src/lib/supabaseClient.ts`
- Singleton export: `export const supabase = createBrowserClient(...)`
- Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- All page components and hooks import this singleton
- Auth methods used: `supabase.auth.getSession()`, `supabase.auth.signInWithPassword()`, `supabase.auth.signUp()`, `supabase.auth.signOut()`, `supabase.auth.onAuthStateChange()`

### Server-side (`createServerClient`)

- **File:** `src/lib/supabaseServer.ts`
- Used **only** in `src/middleware.ts` for Next.js middleware
- Cookie-based session: reads/writes via `request.cookies` and `response.cookies`
- Used for: route protection (`/app/*`), disabled-user redirect, admin gate (`/app/admin`)

### Expo implications

| Web pattern | Expo equivalent needed |
|-------------|----------------------|
| `createBrowserClient` (cookies) | `createClient` with `AsyncStorage` adapter or `@supabase/supabase-js` with custom storage |
| `createServerClient` (middleware) | **Not applicable** — no SSR in Expo. Auth guards move to React Navigation screen wrappers or a root layout guard. |
| `supabase.auth.getSession()` | Same API, but token stored in `AsyncStorage` instead of cookies |
| Middleware profile/role check | Must replicate in-app (e.g., fetch profile on app launch, gate navigation) |

---

## Open Questions / Risks for Expo Parity

1. **No Supabase Realtime used** — The web app uses polling exclusively (3–8 second intervals). Expo should consider Supabase Realtime channels for messaging to avoid battery drain on mobile.

2. **Storage signed URLs (1-hour expiry)** — Web caches signed URLs in `useRef` Maps. Expo will need a persistent cache (e.g., `AsyncStorage` or MMKV) with TTL awareness.

3. **Avatar URL caching** — `src/lib/avatarUrl.ts` uses a per-page-session cache. Expo needs a global cache that survives navigation.

4. **Batch signed URL helper** — `signPostAttachments.ts` uses `createSignedUrls` (batch). Verify this works identically with the React Native Supabase client.

5. **Middleware route protection** — Web uses Next.js middleware to block disabled users and enforce admin-only routes. Expo must replicate this in navigation guards or a root-level auth check.

6. **Profile upsert on signup** — Web creates a profile row immediately after `signUp()`. Expo must do the same (or rely on a DB trigger).

7. **Polling intervals** — `AppMetricsContext` polls every 8s, messages every 3s. These are too aggressive for mobile. Consider: Realtime subscriptions, push notifications, or longer intervals with pull-to-refresh.

8. **File uploads** — Web uses `File` objects from `<input type="file">`. Expo will use `expo-image-picker` / `expo-document-picker` and must convert to `Blob`/`ArrayBuffer` for Supabase storage uploads.

9. **`document.visibilityState` / `window.focus`** — Presence heartbeat uses browser APIs. Expo must use `AppState` from React Native instead.

10. **Foreign-key joins in PostgREST** — Queries like `profiles!questions_author_id_fkey(full_name)` rely on PostgREST join syntax. This works the same with `@supabase/supabase-js` on React Native — no change needed.

---

## Summary Counts

| Category | Count |
|----------|-------|
| Tables | 14 |
| RPC functions | 4 |
| Storage buckets | 3 |
| Files scanned | 18 |
| Supabase client patterns | 2 (browser + server/middleware) |
