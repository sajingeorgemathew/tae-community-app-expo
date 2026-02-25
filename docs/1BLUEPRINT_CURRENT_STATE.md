# TAE Community App - Current State Blueprint

> Generated 2026-02-11 | Read-only audit for safe feature planning

---

## 1. Router Type & Routes

**Router**: Next.js **App Router** (`src/app/`)

- All pages use `"use client"` (client components)
- No API routes (`route.ts`) exist - all backend ops go directly to Supabase
- Middleware at `src/middleware.ts`

### Route Map

| Route | File | Feature |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Redirect: session check -> `/app` or `/login` |
| `/login` | `src/app/login/page.tsx` | Email/password login (Supabase Auth) |
| `/signup` | `src/app/signup/page.tsx` | Account creation + profile upsert |
| `/app` | `src/app/app/page.tsx` | Home dashboard (quick search, recent posts, profile completeness nudge) |
| `/app/feed` | `src/app/app/feed/page.tsx` | Feed with audience/time filters, reactions |
| `/app/feed/new` | `src/app/app/feed/new/page.tsx` | New post creation (media uploads, link attachments) |
| `/app/messages` | `src/app/app/messages/page.tsx` | 1:1 messaging (polling: convos 6s, messages 3s) |
| `/app/directory` | `src/app/app/directory/page.tsx` | Searchable member list with skills |
| `/app/me` | `src/app/app/me/page.tsx` | Own profile edit (avatar, headline, skills) |
| `/app/profile/[id]` | `src/app/app/profile/[id]/page.tsx` | Public profile view + user's posts |
| `/app/admin` | `src/app/app/admin/page.tsx` | Admin dashboard: post moderation, user management |

### Layouts

| Layout | Wraps |
|--------|-------|
| `src/app/layout.tsx` | Root - fonts (Geist), global CSS, metadata |
| `src/app/app/layout.tsx` | All `/app/*` routes - app-shell styling |

### Middleware (`src/middleware.ts`)

- **Protects** `/app` and `/app/*`: redirects unauthenticated users to `/login`
- **Checks** `profiles.is_disabled`: redirects disabled users to `/login?disabled=1`
- **Redirects** authenticated users away from `/login` and `/signup` to `/app`
- **Does NOT check role** - role enforcement is client-side + RLS only

---

## 2. Role System Overview

### Storage

Role is stored as a **text column** on `public.profiles.role` (nullable, no default).

### Known Roles

| Role | How Identified | Notes |
|------|---------------|-------|
| `admin` | Explicitly checked in code and RLS policies | Only role with special powers |
| `member` | Implied default; displayed as fallback (`user.role ?? "member"`) | No DB default set - role is NULL for most users |

No other roles (`faculty`, `tutor`, `student`, `alumni`) exist in the current codebase.

### Where Role Is Checked

#### Client-Side (UI gating)

| File | What it does |
|------|-------------|
| `src/app/app/admin/page.tsx` | Fetches `role`, blocks page if not `admin` ("Not Authorized" screen) |
| `src/app/app/page.tsx` | Shows Admin Dashboard link if `role === 'admin'` |
| `src/app/app/feed/page.tsx` | Sets `isAdmin` state for delete controls |
| `src/app/app/profile/[id]/page.tsx` | Sets `isAdmin` for moderation UI |
| `src/app/app/me/page.tsx` | Displays role badge (read-only) |
| `src/app/app/directory/page.tsx` | Displays role badge per user |

#### Server-Side (RLS policies)

Admin check pattern used across all content tables:
```sql
exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
```

This appears in DELETE policies for: `posts`, `post_attachments`, `post_reactions`, `post_comments`, and in the UPDATE policy for `profiles.is_disabled`.

### Auth Flow

- **Method**: Supabase Auth (email/password via `@supabase/ssr`)
- **Signup**: Creates auth user -> upserts `profiles` row with `full_name`
- **Login**: Signs in -> ensures profile row exists (creates if missing)
- **Session**: Cookie-based via Supabase SSR middleware client
- **Listener**: `onAuthStateChange` in app pages redirects on logout

---

## 3. Database Tables & Feature Mapping

### Tables

| Table | Feature | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles, role, avatar | `id`, `full_name`, `program`, `grad_year`, `role`, `avatar_path`, `headline`, `skills[]`, `is_disabled`, `created_at` |
| `posts` | Community posts | `id`, `author_id`, `content`, `audience` (all/students/alumni), `created_at` |
| `post_attachments` | Post media/links | `id`, `post_id`, `uploader_id`, `type` (image/video/link), `storage_path`, `url` |
| `post_reactions` | Emoji reactions | `post_id`, `user_id`, `emoji` (constraint: only heart/thumbsup/laughing) |
| `post_comments` | Comments on posts | `id`, `post_id`, `author_id`, `content`, `created_at`, `updated_at` |
| `conversations` | 1:1 DM threads | `id`, `created_at` |
| `conversation_members` | Conversation membership | `conversation_id`, `user_id` (composite PK) |
| `messages` | Direct messages | `id`, `conversation_id`, `sender_id`, `content`, `created_at`, `updated_at` |
| `message_attachments` | Message media | `id`, `message_id`, `storage_path`, `type`, `mime_type` |
| `conversation_reads` | Read receipts | `conversation_id`, `user_id`, `last_read_at` (composite PK) |
| `conversation_deliveries` | Delivery tracking | `conversation_id`, `user_id`, `last_delivered_at` (composite PK) |

### RPC Functions

| Function | Purpose | Security |
|----------|---------|----------|
| `create_conversation_1to1(other_user_id)` | Create or reuse 1:1 conversation | SECURITY DEFINER (bypasses RLS to insert both memberships) |
| `get_my_conversations()` | List user's conversations with unread count, avatar, last message preview | SECURITY DEFINER |
| `get_conversation_read_state(conv_id)` | Get other member's last_read_at for read ticks | SECURITY DEFINER |
| `is_avatar_path_owner(path)` | Validates avatar storage path ownership | SECURITY DEFINER, STABLE |
| `extract_conversation_id_from_path(path)` | Parses conversation ID from storage path | SECURITY DEFINER |

### Key Constraints

- `post_reactions`: UNIQUE on `(post_id, user_id, emoji)`; CHECK emoji in `('❤️','👍','😂')`
- `posts`: CHECK audience in `('all','students','alumni')`
- `post_attachments`: CHECK type/storage_path/url validity
- `message_attachments`: UNIQUE on `storage_path`
- All foreign keys use `ON DELETE CASCADE`

---

## 4. RLS Policy Summary

Security is enforced **primarily by RLS** (preferred pattern). Client-side checks exist for UX only.

### profiles

| Op | Who |
|----|-----|
| SELECT | (base policies not in repo - likely Supabase default or initial migration) |
| UPDATE (`is_disabled` only) | Admin only: `exists(... role = 'admin')` |

### posts

| Op | Who |
|----|-----|
| SELECT | All authenticated |
| INSERT | Authenticated, `author_id = auth.uid()` |
| UPDATE | Author only (`author_id = auth.uid()`) |
| DELETE | Author OR admin |

### post_attachments

| Op | Who |
|----|-----|
| SELECT | All authenticated |
| INSERT | Authenticated, `uploader_id = auth.uid()` |
| UPDATE | None (no policy) |
| DELETE | Uploader OR admin |

### post_reactions

| Op | Who |
|----|-----|
| SELECT | All authenticated |
| INSERT | Authenticated, `user_id = auth.uid()` |
| UPDATE | None (delete + re-insert pattern) |
| DELETE | Owner OR admin |

### post_comments

| Op | Who |
|----|-----|
| SELECT | All authenticated |
| INSERT | Authenticated, `author_id = auth.uid()` |
| UPDATE | Author only |
| DELETE | Author OR admin |

### conversations

| Op | Who |
|----|-----|
| SELECT | Conversation member (via `conversation_members` subquery) |
| INSERT | All authenticated |

### conversation_members

| Op | Who |
|----|-----|
| SELECT | Own rows only (`user_id = auth.uid()`) |
| INSERT | Own rows only |
| DELETE | Own rows only |

### messages

| Op | Who |
|----|-----|
| SELECT | Conversation member |
| INSERT | Sender (`sender_id = auth.uid()`) AND conversation member |
| UPDATE | Sender only (content + `updated_at`) |
| DELETE | Sender only |

### message_attachments

| Op | Who |
|----|-----|
| SELECT | Conversation member (via messages + conversation_members join) |
| INSERT | Message sender AND conversation member |
| DELETE | Message sender only |

### conversation_reads

| Op | Who |
|----|-----|
| SELECT | Own rows + conversation members can read each other's |
| INSERT | Own rows only |
| UPDATE | Own rows only |

### conversation_deliveries

| Op | Who |
|----|-----|
| SELECT | Conversation members can read each other's |
| INSERT | Own rows only |
| UPDATE | Own rows only |

---

## 5. Storage Buckets

| Bucket | Visibility | Path Format | Policies |
|--------|-----------|-------------|----------|
| `profile-avatars` | **Private** (signed URLs) | `avatars/{user_uuid}/{filename}` | SELECT: all authenticated; INSERT/UPDATE/DELETE: owner via `is_avatar_path_owner()` |
| `post-media` | **Public** | `posts/{post_id}/{attachment_id}.{ext}` | DELETE: uploader (via `post_attachments` lookup) or admin |
| `message-media` | **Private** (signed URLs) | `messages/{conversation_id}/{message_id}/{filename}` | SELECT/INSERT: conversation member; DELETE: message sender |

### Upload Limits (from client code)

- Post images: JPEG/PNG/WebP, up to 5 images or 1 video per post
- Message images: JPEG/PNG/WebP/GIF, up to 5 MB
- Message videos: MP4/WebM, up to 35 MB

---

## 6. Environment Variables

| Variable | Where Used | Required for Local |
|----------|-----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `supabaseClient.ts`, `supabaseServer.ts` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `supabaseClient.ts`, `supabaseServer.ts` | Yes |

Only 2 env vars. No server-side secrets (no `SUPABASE_SERVICE_ROLE_KEY`). All Supabase access uses the anon key + RLS.

---

## 7. Risk Notes for New Features (Faculty Page, Tutor Role, Q&A)

### Role System Risks

1. **No role enum/constraint**: `profiles.role` is free-text with no CHECK constraint. Adding `faculty` or `tutor` roles requires no schema change, but there's no guard against typos. Consider adding a CHECK constraint: `role IN ('member','admin','faculty','tutor')`.

2. **NULL = member (implicit)**: Role defaults to NULL, displayed as "member" via `?? "member"`. New code must follow this convention or bugs will appear. Consider setting an explicit DB default.

3. **No middleware role check**: The middleware only checks `is_disabled`. The admin page is protected client-side only (fetches role, shows "Not Authorized"). A faculty-only page would need the same pattern or, better, middleware-level enforcement.

4. **Admin check is copy-pasted**: Every page independently queries `profiles.role` and does `if (role === 'admin')`. There's no shared hook or utility. Adding a new role means touching many files. **Recommend**: extract a `useRole()` hook or utility before adding more roles.

### RLS Risks

5. **Admin-only DELETE pattern is hardcoded**: All RLS DELETE policies check `role = 'admin'`. If faculty should moderate posts, those policies need updating. Each affected migration/policy must be altered.

6. **No role-scoped SELECT policies**: All authenticated users can see all posts and profiles. If faculty content should be restricted, new SELECT policies are needed.

7. **profiles base RLS policies not in repo**: The initial `profiles` table creation (with its SELECT/INSERT/UPDATE policies) is not in the migration files. It was likely set up via Supabase dashboard or an earlier migration not tracked in git. **Recommend**: audit the live DB policies for `profiles` and add a migration to codify them.

### Architecture Risks

8. **All pages are client components**: Every page uses `"use client"`. Server components or server actions are not used. This means role checks always happen after page load (flash of unauthorized content possible). For sensitive new pages, consider server-side checks.

9. **No API routes**: All DB access is direct Supabase calls from the client. Adding complex Q&A features (voting, accepted answers, notifications) will increase client-side complexity. Consider whether server actions or API routes would be cleaner.

10. **Polling, not real-time**: Messages use polling (3s/6s intervals). If Q&A needs live updates (new answers, vote counts), the same polling pattern can work but Supabase Realtime subscriptions would scale better.

11. **Audience field is post-level only**: Posts have `audience` (all/students/alumni). There's no concept of "faculty-only" content yet. Adding it means either extending the audience enum or creating a separate visibility system.

12. **CASCADE deletes everywhere**: All FKs cascade on delete. Deleting a user cascades to all their posts, messages, reactions, etc. This is fine but must be understood when adding new tables with foreign keys.

### Recommended Pre-Work Before New Features

- [ ] Add CHECK constraint on `profiles.role`
- [ ] Set explicit default for `profiles.role` (e.g., `'member'`)
- [ ] Extract shared `useRole()` hook to avoid copy-paste role checks
- [ ] Audit live `profiles` table RLS policies and codify in a migration
- [ ] Decide: should faculty/tutor roles have moderation powers? If so, update RLS DELETE policies
- [ ] Decide: should any content be role-restricted at the SELECT level?
