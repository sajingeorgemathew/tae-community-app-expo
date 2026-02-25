# TAE Community App — Current State Blueprint

> **Generated:** 2026-02-25 | **Branch:** `docs/blueprint-current-state` | **Build status:** PASS (see §11)

---

## Table of Contents

1. [Product Summary](#1-product-summary)
2. [Technical Stack](#2-technical-stack)
3. [Route Map](#3-route-map)
4. [Data Model Overview](#4-data-model-overview)
5. [Security Model](#5-security-model)
6. [Performance / Scaling Improvements Completed](#6-performancescaling-improvements-completed)
7. [Dark Mode Work Completed](#7-dark-mode-work-completed)
8. [Mobile Work Completed](#8-mobile-work-completed)
9. [Profile Enhancement Work Completed](#9-profile-enhancement-work-completed)
10. [Open Issues / Risks](#10-open-issues--risks)
11. [Build Verification](#11-build-verification)
12. [Next Plan — Proposed Tickets](#12-next-plan--proposed-tickets)

---

## 1. Product Summary

TAE Community App is a private academic community platform for university students, alumni, tutors, and administrators. Built as a Next.js web app backed by Supabase.

### Roles

| Role | Description |
|---|---|
| `member` | Default role. Can post, message, ask questions, browse directory. |
| `tutor` | Can answer Q&A questions. Appears on Faculty page if `is_listed_as_tutor = true`. |
| `admin` | Full moderation: disable users, delete posts, manage tutor roles, assign courses. |
| `alumni` | Same as member; audience tag on posts. |

### Main Flows

- **Feed:** Create text/image/video/link posts with audience targeting (all/students/alumni). Reactions (emoji), comments, delete.
- **Messaging:** 1:1 real-time-ish messaging with attachments, read receipts (WhatsApp-style ticks), edit/delete, day separators, online presence.
- **Q&A:** Members ask questions; tutors/admins answer. Reply previews on list page.
- **Directory:** Browse all members with search, presence indicators, message shortcuts.
- **Faculty:** Browse listed tutors filtered by course assignment.
- **Profiles:** View/edit own profile (avatar, headline, skills, work, qualifications, experience). View others' profiles. Profile completeness scoring.
- **Admin:** Post moderation (bulk delete), user management (disable/enable, role changes), tutor management (promote/demote, course assignments).
- **Dashboard:** Welcome page with stat cards, quick search, recent posts/questions, unread badges.

---

## 2. Technical Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 16.1.1 | App Router, all pages are `"use client"` |
| **React** | 19.2.3 | React 19 with concurrent features |
| **Styling** | Tailwind CSS 4 | `@tailwindcss/postcss`, class-based dark mode via `@variant dark` |
| **Dark Mode** | `next-themes` 0.4.6 | `ThemeProvider` with `attribute="class"`, `defaultTheme="light"` |
| **Auth** | Supabase Auth | Email/password, `getUser()` in middleware, `getSession()` in client |
| **Database** | Supabase (PostgreSQL) | All queries via browser client with anon key + RLS |
| **Storage** | Supabase Storage | 3 buckets: `post-media`, `profile-avatars` (private), `message-media` (private) |
| **API Pattern** | No API routes | All DB calls go through `@supabase/supabase-js` browser client. No `service_role` key used anywhere. |
| **Middleware** | `src/middleware.ts` | Auth gate for `/app/*`, disabled-user check, admin route protection |
| **TypeScript** | 5.x | Strict mode, all files `.ts` / `.tsx` |
| **Build** | `next build` | Static prerender for most routes; dynamic for `[id]` routes |

### Key Library Files

| File | Purpose |
|---|---|
| `src/lib/supabaseClient.ts` | Browser Supabase client singleton (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `src/lib/supabaseServer.ts` | Middleware Supabase client |
| `src/lib/signPostAttachments.ts` | Batch-sign media URLs via `createSignedUrls()` (single Supabase call) |
| `src/lib/avatarUrl.ts` | Avatar URL signing helper |
| `src/lib/usePresenceHeartbeat.ts` | Presence heartbeat (upsert every 45s + visibility events) |
| `src/lib/AppMetricsContext.tsx` | Shared metrics provider (unread messages, Q&A activity, online count). Polls every 8s. |

### Shared Components

| Component | File | Purpose |
|---|---|---|
| `AppSidebar` | `src/components/AppSidebar.tsx` | Shared sidebar nav with badges, theme toggle, user block, logout |
| `MobileBottomNav` | `src/components/MobileBottomNav.tsx` | Fixed bottom nav for mobile (<768px) with 6 tabs incl. "More" menu |
| `PostCard` | `src/components/PostCard.tsx` | Post display: content, media, reactions, comments, delete |
| `StatCard` | `src/components/StatCard.tsx` | Metric card for dashboard |
| `Avatar` | `src/components/Avatar.tsx` | Profile photo with initials fallback. Sizes: sm/md/lg/xl |
| `ThemeProvider` | `src/components/ThemeProvider.tsx` | `next-themes` wrapper |
| `PresenceProvider` | `src/components/PresenceProvider.tsx` | Online heartbeat (renders null) |

---

## 3. Route Map

| Route | File | Purpose |
|---|---|---|
| `/` | `src/app/page.tsx` | Landing redirect: → `/app` (auth) or `/login` (anon) |
| `/login` | `src/app/login/page.tsx` | Email/password login. TAE logo, branded card. |
| `/signup` | `src/app/signup/page.tsx` | Registration (full name, email, password min 6). |
| `/app` | `src/app/app/page.tsx` | Dashboard: hero banner, 4 stat cards, quick search, recent posts/questions, profile completion prompt. |
| `/app/feed` | `src/app/app/feed/page.tsx` | Community feed with audience filters, cursor pagination (20/page), fresh-first ranking. |
| `/app/feed/new` | `src/app/app/feed/new/page.tsx` | Create post: text + audience + optional images (max 5×5MB) / video (max 1×50MB) / link. |
| `/app/messages` | `src/app/app/messages/page.tsx` | 1:1 messaging. Desktop: two-pane. Mobile: list-only → thread-only with back button. Polling: 3s messages, 6s conversations. |
| `/app/directory` | `src/app/app/directory/page.tsx` | Member directory. Client-side search. `.limit(50)`. Presence dots. |
| `/app/faculty` | `src/app/app/faculty/page.tsx` | Tutor listing (`role='tutor'` + `is_listed_as_tutor=true`). Course filter dropdown. |
| `/app/questions` | `src/app/app/questions/page.tsx` | Q&A list via `get_questions_feed()` RPC. "Ask a Question" form. Reply previews. |
| `/app/questions/[id]` | `src/app/app/questions/[id]/page.tsx` | Question detail + answers. Answer form for tutor/admin only. |
| `/app/me` | `src/app/app/me/page.tsx` | Own profile: view/edit mode. Avatar upload, skills editor, work/qualifications/experience. Completeness scoring (7 fields). |
| `/app/profile/[id]` | `src/app/app/profile/[id]/page.tsx` | View other user's profile: 2-column layout, posts, message button. |
| `/app/admin` | `src/app/app/admin/page.tsx` | Admin-only. 3 sections: Posts moderation (bulk delete, filters, pagination), Tutors (role/listing/courses), Users (disable/enable, bulk actions, pagination). |

### Layout

| File | Scope |
|---|---|
| `src/app/layout.tsx` | Root: Geist fonts, `ThemeProvider`, `suppressHydrationWarning` |
| `src/app/app/layout.tsx` | Authenticated shell: `AppSidebar` + `MobileBottomNav` + `PresenceProvider` + `AppMetricsProvider`. Dark: `dark:bg-slate-950 dark:text-slate-100`. |

---

## 4. Data Model Overview

### Tables

| Table | Migration File | Key Fields | Used By |
|---|---|---|---|
| `profiles` | Not in repo (Supabase auth trigger) | `id`, `full_name`, `email`, `program`, `grad_year`, `role`, `is_disabled`, `avatar_path`, `headline`, `skills` (text[]), `is_listed_as_tutor`, `current_work`, `qualifications`, `experience`, `created_at` | All pages |
| `posts` | `20250125_create_posts_table.sql` | `id`, `author_id`, `content`, `audience` (all/students/alumni), `created_at` | Feed, Dashboard, Profile, Admin |
| `post_attachments` | `20250126_create_post_attachments_table.sql` | `id`, `post_id`, `type` (image/video/link), `storage_path`, `url` | Feed, New Post, Profile, Admin |
| `post_reactions` | `20250128_create_post_reactions_table.sql` | `post_id`, `user_id`, `emoji` | PostCard |
| `post_comments` | `20250129_create_post_comments_table.sql` | `id`, `post_id`, `user_id`, `content`, `created_at` | PostCard |
| `conversations` | `20250203_create_messaging_tables.sql` | `id`, `created_at` | Messages |
| `conversation_members` | `20250203_create_messaging_tables.sql` | `conversation_id`, `user_id` | Messages |
| `messages` | `20250203_create_messaging_tables.sql` | `id`, `conversation_id`, `sender_id`, `content`, `created_at`, `updated_at` | Messages |
| `message_attachments` | `20250203_create_messaging_tables.sql` | `id`, `message_id`, `type`, `storage_path`, `file_name`, `file_size` | Messages |
| `conversation_reads` | `20250205_ticket27_3_conversation_reads.sql` | `conversation_id`, `user_id`, `last_read_at` | Messages (unread state) |
| `conversation_deliveries` | `20250206_ticket29_conversation_deliveries.sql` | `conversation_id`, `user_id`, `last_delivered_at` | Messages (tick state) |
| `courses` | `20250212_ticket44_courses_tutor_assignments_db.sql` | `id`, `code`, `title`, `is_active`, `created_at` | Admin, Faculty |
| `tutor_course_assignments` | `20250212_ticket44_courses_tutor_assignments_db.sql` | `tutor_id`, `course_id` (unique composite) | Admin, Faculty |
| `questions` | `20250213_ticket47_qa_tables_db.sql` | `id`, `title`, `body`, `author_id`, `target_tutor_id`, `target_course_id`, `created_at`, `updated_at` | Questions, Dashboard |
| `answers` | `20250213_ticket47_qa_tables_db.sql` | `id`, `question_id`, `body`, `author_id`, `created_at`, `updated_at` | Question Detail |
| `qa_activity_reads` | `20250215_ticket51d_qa_activity_reads.sql` | `user_id` (PK), `last_seen_at` | Dashboard (Q&A badge) |
| `presence` | `20250216_ticket52_online_presence.sql` | `user_id` (PK), `last_seen_at` | Directory, Messages, Dashboard, Q&A |

### Storage Buckets

| Bucket | Public? | Signing | Used By |
|---|---|---|---|
| `post-media` | Verify in dashboard | `createSignedUrls()` batch, 3600s TTL | Feed, Profile, Admin |
| `profile-avatars` | Private | `createSignedUrl()`, 3600s TTL | All pages with Avatar |
| `message-media` | Private | `createSignedUrl()`, 3600s TTL | Messages |

### RPC Functions

| Function | Type | Purpose |
|---|---|---|
| `create_conversation_1to1(uuid)` | SECURITY DEFINER | Create/reuse 1:1 conversation |
| `get_my_conversations()` | SECURITY DEFINER | Conversation list with unread counts (joins 4 tables) |
| `get_conversation_read_state(uuid)` | SECURITY DEFINER | Other member's last_read_at |
| `get_questions_feed(int)` | SQL STABLE | Questions with author/replier info (RLS applies) |
| `is_avatar_path_owner(text)` | SECURITY DEFINER | Avatar storage path ownership check |
| `extract_conversation_id_from_path(text)` | Helper | Extracts conversation UUID from storage path |
| `set_updated_at()` | Trigger | Auto-update `updated_at` column |

---

## 5. Security Model

### Server-Side Enforcement (Middleware)

**File:** `src/middleware.ts` (lines 1-60)

- [x] **Authentication gate:** All `/app/*` routes require valid session via `supabase.auth.getUser()`. Redirects to `/login`.
- [x] **Disabled user block:** Queries `profiles.is_disabled`; redirects disabled users to `/login?disabled=1`.
- [x] **Admin route protection (SEC-01):** Queries `profiles.role`; redirects non-admins from `/app/admin*` to `/app`. Implemented in PR #86.
- [x] **Auth page redirect:** Authenticated users visiting `/login` or `/signup` redirect to `/app`.

### Row-Level Security (RLS) — Database Enforcement

All tables have RLS enabled. Key policies from migrations:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `posts` | All authenticated | `author_id = auth.uid()` | `author_id = auth.uid()` | Author OR admin |
| `post_attachments` | All authenticated | Author match | — | Author OR admin |
| `post_reactions` | All authenticated | `user_id = auth.uid()` | — | Own reaction |
| `post_comments` | All authenticated | `user_id = auth.uid()` | Own comments | Own comments |
| `conversations` | Members only | `with check (true)` | — | — |
| `conversation_members` | Own memberships | `user_id = auth.uid()` | — | — |
| `messages` | Conversation members | Sender must be member | Sender only | Sender only |
| `courses` | All authenticated | Admin only | Admin only | Admin only |
| `tutor_course_assignments` | All authenticated | Admin only | — | Admin only |
| `questions` | All authenticated | `author_id = auth.uid()` | Author only | Author OR admin |
| `answers` | All authenticated | Tutor/admin only | Author only | Author OR admin |
| `qa_activity_reads` | Own row | Own row (upsert) | Own row | — |
| `presence` | All authenticated | Own row (upsert) | Own row | Own row |

### Frontend-Only Enforcement

These checks exist only in client-side code (not RLS-backed):

| Check | File | Note |
|---|---|---|
| Admin UI visibility | `src/app/app/admin/page.tsx` | Client `isAdmin` state hides UI. **Mitigated:** middleware now blocks route server-side (SEC-01). |
| Tutor answer form gate | `src/app/app/questions/[id]/page.tsx` | UI hides form for non-tutor/admin. **Backed by RLS:** answers INSERT requires tutor/admin role. |
| Post audience display | `src/app/app/feed/page.tsx` | Client-side filter. All posts readable via RLS regardless. |

### Profiles Table — Dashboard Verification Required

**Critical:** The `profiles` table was not created via repo migrations. Base SELECT/INSERT/UPDATE policies are not in version control. Per `docs/SECURITY_AUDIT_01.md` findings F-02 and F-04:

- [ ] Verify user-self-UPDATE policy restricts columns (must exclude `role`, `is_disabled`, `is_listed_as_tutor`)
- [ ] Verify SELECT policy exists for all authenticated
- [ ] Export all profiles policies into a migration file

---

## 6. Performance / Scaling Improvements Completed

### UI-04.2 — Batch Signed URLs
- **Goal:** Remove sequential `createSignedUrl` loops; batch into single `createSignedUrls` call.
- **PR:** #87 (`0ddb84f`)
- **Key Files:** `src/lib/signPostAttachments.ts` (new helper), `src/app/app/feed/page.tsx`, `src/app/app/profile/[id]/page.tsx`, `src/app/app/me/page.tsx`, `src/app/app/admin/page.tsx`
- **Verify:** Feed loads with all media; Network tab shows single batch URL signing call instead of N sequential calls.

### UI-04.3 — Lazy Media Loading
- **Goal:** Browser-native lazy loading for images/videos in PostCard.
- **PR:** #88 (`cfbb2cf`)
- **Key Files:** `src/components/PostCard.tsx` — added `loading="lazy"` + `decoding="async"` on `<img>`, `preload="metadata"` + `playsInline` on `<video>`.
- **Verify:** Images lazy-load on scroll; videos fetch metadata only until play.

### UI-04.4 — Feed Pagination
- **Goal:** Cursor pagination on `/app/feed` (20 posts/page).
- **PR:** #89 (`64e8c01`)
- **Key Files:** `src/app/app/feed/page.tsx` — `PAGE_SIZE=20`, `(created_at, id)` cursor, "Load more" button.
- **Verify:** Initial load shows ≤20 posts; "Load more" appends next page; no duplicates; filter reset works.

### UI-04.5 — Profile Pagination
- **Goal:** Cursor pagination on `/app/me` and `/app/profile/[id]` (20 posts/page).
- **PR:** #90 (`80286e1`)
- **Key Files:** `src/app/app/me/page.tsx`, `src/app/app/profile/[id]/page.tsx`
- **Verify:** Profile posts load 20 at a time; "Load more" appends; reactions/comments work on all loaded posts.

### UI-04.6 — Admin Pagination
- **Goal:** Pagination for posts (20/page) and users (25/page) on `/app/admin`.
- **PR:** #91 (`adfdab8`)
- **Key Files:** `src/app/app/admin/page.tsx` — `PAGE_SIZE=20`, `USER_PAGE_SIZE=25`, cursor-based load-more.
- **Verify:** Admin shows paginated posts/users; bulk actions work across pages; time filter resets pagination.

### SEC-01 — Lock Admin Route in Middleware
- **Goal:** Server-side redirect for non-admin users hitting `/app/admin`.
- **PR:** #86 (`1435d9f`)
- **Key Files:** `src/middleware.ts` — extended profile query to `.select("is_disabled, role")`, added `pathname.startsWith("/app/admin")` check.
- **Verify:** Non-admin navigating to `/app/admin` is redirected to `/app` before page renders. Admin JS bundle not served to non-admins.

---

## 7. Dark Mode Work Completed

All dark mode tickets use Tailwind `dark:` classes only — zero logic/query/routing changes.

### DM-01 — Theme System + Toggle
- **PR:** #92 (`74b16c4`)
- **Goal:** `next-themes` integration with class-based dark mode; sidebar toggle button (sun/moon icon).
- **Key Files:** `src/components/ThemeProvider.tsx` (new), `src/app/layout.tsx`, `src/app/globals.css`, `src/components/AppSidebar.tsx`
- **Verify:** Toggle switches Light/Dark; persists after refresh.

### DM-02 — Shell Dark Mode Polish
- **PR:** #93 (`fdf4de3`)
- **Goal:** Sidebar + global layout surfaces dark mode.
- **Key Files:** `src/components/AppSidebar.tsx`, `src/app/app/layout.tsx`, `src/app/globals.css`
- **Verify:** Sidebar text/links/dividers readable in dark mode; main background dark.

### DM-03 — Shared Components Dark Mode Pass
- **PR:** #94 (`0dad692`)
- **Goal:** `dark:` variants on PostCard, StatCard, Avatar, Dashboard, Admin.
- **Key Files:** `src/components/PostCard.tsx`, `src/components/StatCard.tsx`, `src/components/Avatar.tsx`, `src/app/app/page.tsx`, `src/app/app/admin/page.tsx`, `src/app/globals.css`
- **Verify:** Cards, badges, dropdowns, tables all readable in dark mode across multiple pages.

### DM-05 — Feed Dark Mode Polish
- **PR:** #99 (`7d2a099`)
- **Goal:** Feed page-level dark styling (header, filters, buttons, empty state).
- **Key Files:** `src/app/app/feed/page.tsx`
- **Verify:** Feed header, filter pills, "New Post" button, empty state all readable in dark.

### DM-06 — Profiles Dark Mode Polish
- **PR:** #96 (`f9987be`)
- **Goal:** `/app/me` and `/app/profile/[id]` dark mode.
- **Key Files:** `src/app/app/me/page.tsx`, `src/app/app/profile/[id]/page.tsx`
- **Verify:** Profile identity card, skills chips, completeness bar, form inputs all dark-styled.

### DM-07 — Messages Dark Mode Polish
- **PR:** #95 (`0173486`)
- **Goal:** Messages page dark mode (conversation list, thread, composer).
- **Key Files:** `src/app/app/messages/page.tsx`
- **Verify:** Conversation list, message bubbles, day separators, composer all readable.

### DM-08 — Directory + Faculty Dark Mode Polish
- **PR:** #97 (`d55f658`)
- **Goal:** Directory and Faculty pages dark mode.
- **Key Files:** `src/app/app/directory/page.tsx`, `src/app/app/faculty/page.tsx`
- **Verify:** Cards, search inputs, role badges, presence dots, skills/course chips dark-styled.

### DM-09 — Questions Dark Mode Polish
- **PR:** #98 (`2745722`)
- **Goal:** Questions list + detail pages dark mode.
- **Key Files:** `src/app/app/questions/page.tsx`, `src/app/app/questions/[id]/page.tsx`
- **Verify:** Question cards, reply counts, form inputs, answer cards all dark-styled.

### DM-10 — Admin Dark Mode Polish
- **PR:** #101 (`654aab5`)
- **Goal:** Admin dashboard remaining dark mode gaps.
- **Key Files:** `src/app/app/admin/page.tsx`
- **Verify:** Filter pills inverted, section cards dark, search inputs, bulk action bars readable.

### DM-11 (New Post) — New Post Dark Mode Polish
- **PR:** #102 (`44350b7`)
- **Goal:** Create post page dark mode.
- **Key Files:** `src/app/app/feed/new/page.tsx`
- **Verify:** Textarea, audience pills, dropzones, file previews, buttons all dark-styled.

### DM-11 (Auth) — Login/Signup Dark Mode Polish
- **PR:** #107 (`5d9f7d5`)
- **Goal:** Auth pages correct in dark mode (theme persists after logout).
- **Key Files:** `src/app/login/page.tsx`, `src/app/signup/page.tsx`
- **Verify:** Login/signup cards, inputs, buttons, links all readable in dark mode.

> **Note:** No DM-04 ticket exists. Two tickets share the DM-11 identifier (New Post and Auth) — numbering overlap in the original ticket series.

---

## 8. Mobile Work Completed

All mobile tickets are CSS/layout-only with no logic changes. Desktop layout remains unchanged.

### M-01 — Mobile Bottom Navigation
- **PR:** #103 (`1f96b8b`)
- **Goal:** Fixed bottom nav bar for mobile (<768px) with 5 tabs + unread badge.
- **Key Files:** `src/components/MobileBottomNav.tsx` (new), `src/app/app/layout.tsx` (added `pb-20 md:pb-0`)
- **Verify:** Bottom nav visible on mobile with Home/Feed/Directory/Messages/Profile tabs; hidden on desktop; unread badge on Messages.

### M-02 — Mobile More Menu
- **PR:** #104 (`a7956a6`)
- **Goal:** 6th "More" tab with theme toggle + logout in floating popup.
- **Key Files:** `src/components/MobileBottomNav.tsx`
- **Verify:** "More" opens popup; theme toggle works; logout redirects to `/login`; click-outside dismisses.

### M-03 — Messages Mobile Layout
- **PR:** #105 (`29f2398`)
- **Goal:** Mobile: show conversation list full-width; on tap, show thread full-width with back button.
- **Key Files:** `src/app/app/messages/page.tsx`
- **Verify:** Mobile shows list-only → thread-only transition; back button returns to list; desktop two-pane unchanged.

### M-04 — Mobile Polish Sweep (CSS-only)
- **PR:** #106 (`08a45f1`)
- **Goal:** Fix overflow/horizontal scrolling, text wrapping, tap targets, responsive spacing across all pages.
- **Key Files:** `src/app/app/page.tsx`, `src/app/app/feed/page.tsx`, `src/components/PostCard.tsx`, `src/components/StatCard.tsx`, `src/app/app/me/page.tsx`, `src/app/app/profile/[id]/page.tsx`, `src/app/app/directory/page.tsx`, `src/app/app/faculty/page.tsx`, `src/app/app/questions/page.tsx`, `src/app/app/admin/page.tsx`
- **Verify:** No horizontal scroll at 320px and 390px viewport widths on any page.

### M-06 — Directory Card CTA Row
- **PR:** #108 (`1bf5649`)
- **Goal:** Keep "View Profile" and "Message" buttons side-by-side on mobile (CSS Grid 2-col).
- **Key Files:** `src/app/app/directory/page.tsx`
- **Verify:** At 360-430px widths, CTAs remain 2-up with equal width; desktop layout unchanged.

### BRAND-01 — Site Title + Favicon
- **PR:** #109 (`86bf661`)
- **Goal:** Set site title to "TAE Community" and add TAE favicon.
- **Key Files:** `src/app/layout.tsx`, `src/app/icon.jpg` (new)
- **Verify:** Browser tab shows "TAE Community" title and TAE logo favicon.

---

## 9. Profile Enhancement Work Completed

### P-01 — Profile Fields DB
- **PR:** #110 (`ff606c8`)
- **Goal:** Add `current_work`, `qualifications`, `experience` (nullable text) columns to `profiles`.
- **Key Files:** `supabase/migrations/20250217_p01_profile_fields.sql`
- **Verify:** Columns exist in Supabase; `select current_work, qualifications, experience from profiles limit 1` succeeds.

### P-02 — Read-Only Profile Sections
- **PR:** #111 (`5148824`)
- **Goal:** Display work/qualifications/experience on `/app/profile/[id]` (read-only, conditional).
- **Key Files:** `src/app/app/profile/[id]/page.tsx`
- **Verify:** Profile with populated fields shows sections; empty fields hidden.

### P-03 — Editable Profile Fields on /me
- **PR:** #112 (`0ae771d`)
- **Goal:** Allow editing 3 new fields on `/app/me` with textarea inputs.
- **Key Files:** `src/app/app/me/page.tsx`
- **Verify:** Edit/save/refresh cycle persists; cancel restores; empty → null in DB.

### P-04 — Profile Completeness for New Fields
- **PR:** #113 (`9c78768`)
- **Goal:** Include new fields in completeness scoring (initially as bonus fields).
- **Key Files:** `src/app/app/me/page.tsx`
- **Verify:** Filling new fields increases completeness percentage.

### P-04.1 — Completeness All Required
- **PR:** #114 (`0796282`)
- **Goal:** All 7 fields equally weighted for 100% completeness.
- **Key Files:** `src/app/app/me/page.tsx`
- **Verify:** All 7 fields must be filled for 100%; missing any shows amber dot in checklist.

---

## 10. Open Issues / Risks

### Observed Risk: Profiles RLS Not in Version Control
- **Files:** No migration creates `profiles` table or its base SELECT/INSERT/user-UPDATE policies.
- **Impact:** If user-self-UPDATE policy doesn't restrict columns, privilege escalation possible (`role: 'admin'` via browser console).
- **Source:** `docs/SECURITY_AUDIT_01.md` findings F-02, F-04.

### Observed Risk: `conversation_members` INSERT Policy Too Permissive
- **Files:** `supabase/migrations/20250203_create_messaging_tables.sql`
- **Impact:** Any authenticated user can insert themselves into any existing conversation by knowing the conversation UUID.
- **Source:** `docs/SECURITY_AUDIT_01.md` finding F-07.

### Observed Risk: `post-media` Bucket Policies Not in Version Control
- **Files:** Only DELETE policy exists in `supabase/migrations/20250127_storage_delete_policy.sql`. No INSERT/SELECT policies in repo.
- **Impact:** Bucket public/private state and upload restrictions unknown without dashboard verification.
- **Source:** `docs/SECURITY_AUDIT_01.md` finding F-06.

### Observed Risk: Polling Scalability
- **Files:** `src/app/app/messages/page.tsx` (3s + 6s polls), `src/lib/AppMetricsContext.tsx` (8s poll), `src/lib/usePresenceHeartbeat.ts` (45s heartbeat)
- **Impact:** ~37 requests/minute per active user with messages open. `get_my_conversations()` RPC is expensive (4-table join). At 100 concurrent users → ~3,700 req/min.
- **Source:** `docs/SECURITY_AUDIT_01.md` finding F-09.

### Observed Risk: Directory Has No Server-Side Pagination
- **Files:** `src/app/app/directory/page.tsx` — `.limit(50)` hard cap, client-side search only.
- **Impact:** Communities >50 members will have undiscoverable members. Search only works within loaded 50.
- **Source:** `docs/SECURITY_AUDIT_01.md` finding F-10.

### Observed Risk: No Rate Limiting
- **Files:** All operations via browser Supabase client. No API routes or edge functions with rate limiting.
- **Impact:** Spam potential for posts/comments/messages/reactions.
- **Source:** `docs/SECURITY_AUDIT_01.md` finding F-08.

### Observed Risk: Signed URLs Expire Without Refresh
- **Files:** `src/lib/signPostAttachments.ts` (3600s TTL), messages page (3600s TTL).
- **Impact:** Media breaks after 1 hour on open pages. No refresh mechanism.
- **Source:** `docs/SECURITY_AUDIT_01.md` finding F-13.

### Observed Risk: `getSession()` Used in Client Components
- **Files:** `src/app/app/admin/page.tsx`, `src/app/app/messages/page.tsx`, `src/app/app/me/page.tsx`, `src/app/app/directory/page.tsx`, `src/app/app/feed/page.tsx`, `src/app/app/feed/new/page.tsx`, `src/app/app/page.tsx`, `src/app/app/profile/[id]/page.tsx`
- **Impact:** `getSession()` reads local storage without server verification. Disabled users with open tabs can continue operating until next navigation triggers middleware.
- **Source:** `docs/SECURITY_AUDIT_01.md` finding F-05.

### Observed Risk: No Audit Trail for Admin Actions
- **Files:** `src/app/app/admin/page.tsx`
- **Impact:** No record of who disabled users, deleted posts, changed roles, or assigned courses.
- **Source:** `docs/SECURITY_AUDIT_01.md` finding F-14.

---

## 11. Build Verification

Performed on `docs/blueprint-current-state` branch, 2026-02-25:

### TypeScript Check
```
npx tsc --noEmit
```
**Result: PASS** (zero errors)

### Production Build
```
npm run build
```
**Result: PASS**

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /app
├ ○ /app/admin
├ ○ /app/directory
├ ○ /app/faculty
├ ○ /app/feed
├ ○ /app/feed/new
├ ○ /app/me
├ ○ /app/messages
├ ƒ /app/profile/[id]
├ ○ /app/questions
├ ƒ /app/questions/[id]
├ ○ /icon.jpg
├ ○ /login
└ ○ /signup

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

---

## 12. Next Plan — Proposed Tickets

### A) Mobile Web Polish (Remaining)

| # | Ticket | Goal | Priority |
|---|---|---|---|
| 1 | **M-07: Auth/Login Dark Mode Visual QA** | Verify login/signup dark mode renders correctly on actual mobile devices (not just desktop resize). Fix any remaining contrast or spacing issues. | Low |
| 2 | **M-08: Admin Tables Mobile Scroll UX** | The admin tutor/user tables have `min-w-[700px]` for horizontal scroll (M-04). Add scroll hint shadow/indicator so users know the table is scrollable. | Low |

### B) Deployment Readiness

| # | Ticket | Goal | Priority |
|---|---|---|---|
| 3 | **DEPLOY-01: Vercel Environment Variables Checklist** | Document and verify all required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Verify no `service_role` key needed. Test build on Vercel with env vars set. | High |
| 4 | **DEPLOY-02: Supabase Dashboard Policy Export** | Export all `profiles` RLS policies from dashboard into migration file. Verify `post-media` bucket settings. Lock down user-self-UPDATE policy to safe columns. Addresses SECURITY_AUDIT_01 findings F-02, F-04, F-06. | Critical |
| 5 | **DEPLOY-03: Fix `conversation_members` INSERT Policy** | Drop direct INSERT policy on `conversation_members` (the `create_conversation_1to1` RPC bypasses RLS). Prevents unauthorized conversation joining. Addresses SECURITY_AUDIT_01 finding F-07. | High |
| 6 | **DEPLOY-04: Build Smoke Test Script** | Create a simple CI script: `npx tsc --noEmit && npm run build`. Optionally add to GitHub Actions. | Medium |

### C) Expo Migration Prep

| # | Ticket | Goal | Priority |
|---|---|---|---|
| 7 | **EXPO-01: API Boundary Inventory** | Audit all `supabase.from()` and `supabase.rpc()` calls across client pages. Document every query as a potential API contract. Identify calls that should become server-side API routes for mobile. | Medium |
| 8 | **EXPO-02: Shared TypeScript Types** | Extract shared interfaces (`Profile`, `Post`, `Attachment`, `Conversation`, `Message`, `Question`, `Answer`) into a `src/types/` directory. These types will be shared between Next.js web and Expo mobile. | Medium |
| 9 | **EXPO-03: Storage/Media Strategy** | Document media upload flow (signed URLs, bucket paths, size limits). Plan Expo equivalent using `expo-image-picker` + Supabase JS client. Determine if signed URL TTL needs adjustment for mobile (network interruptions). | Medium |
| 10 | **EXPO-04: Auth Approach for Mobile** | Document current auth flow (email/password via `@supabase/ssr`). Plan Expo auth using `@supabase/supabase-js` directly (no SSR needed). Determine session persistence strategy (AsyncStorage vs SecureStore). Plan deep linking for auth redirects. | Medium |

---

## Appendix: Complete Ticket History (by commit order)

<details>
<summary>Click to expand full ticket list (114 PRs)</summary>

| PR | Commit | Ticket | Summary |
|---|---|---|---|
| #20 | `e778875` | Ticket 18 | Feed ranking (fresh-first + daily shuffle) |
| #21 | `3c8553d` | Ticket 19 | Reactions v1 (toggle + counts) |
| #22 | `9383bc0` | Hotfix | Feed filter includes audience=all |
| #23 | `f0eb426` | Ticket 20 | Comments v1 (add/edit/delete) |
| #24 | `db492b6` | Ticket 21 | Admin moderation dashboard |
| #25 | `d81e31f` | Ticket 22 | Admin bulk moderation + nav link |
| #26 | `997df1e` | Ticket 24 | Messaging DB foundation |
| #27 | `7726905` | Ticket 25 | Create/reuse 1:1 conversation RPC |
| #28 | `1e9f54c` | Ticket 26 | Messaging UI (list + thread + send) |
| #29 | `00bc06d` | Ticket 27 | Message attachments |
| #30 | `67f2840` | Ticket 27.2 | Attachment-only message preview fix |
| #31 | `d240051` | Ticket 27.3 | Unread state (dot + bold) |
| #32 | `96e07fb` | Ticket 27.4 | Polling live updates |
| — | `69099a2` | Ticket 27.3 fix | Unread flicker guard |
| #33 | `0e833ca` | Ticket 28 | WhatsApp-style timestamps |
| #34 | `8a8d26d` | Ticket 28.1 | Day separators in chat |
| #35 | `c1e8ed6` | Ticket 29 | Message ticks (sent/delivered/read) |
| #36 | `a862626` | Ticket 29.1 | Instant read receipts fix |
| #37 | `e94a70b` | Ticket 30 | Edit/delete own messages |
| #38 | `ad1eb70` | Ticket 31 | Messaging polish (scroll + Shift+Enter) |
| #39 | `55fa64b` | Ticket 32 | Home dashboard layout |
| #40 | `594484d` | Ticket 33 | Quick search console |
| #41 | `01158fe` | Ticket 34 | Global theme (navy/white) |
| #42 | `bc5ac49` | Ticket 35 | Login branding |
| #43 | `8fe8174` | Ticket 36 | Profile avatars DB + storage |
| #44 | `bd3c5a8` | Ticket 37 | Edit profile (avatar + headline + skills) |
| #45 | `269e65e` | Ticket 37.1 | Profile visibility fix (signed avatars) |
| #46 | `d646af0` | Ticket 38 | Avatars everywhere (feed, directory, search, profile) |
| #47 | `dd9857c` | Ticket 38.1 | Avatars in messages conversation list |
| #48 | `b1b9600` | Ticket 38.2 | Avatars in messages thread |
| #49 | `423509c` | Ticket 38.3 | Avatars on admin dashboard |
| #50 | `58ad94e` | Ticket 39 | Skills chips on profile + search |
| #51 | `6ff798d` | Ticket 39.1 | Compact skill chips in search |
| #52 | `80b4952` | Ticket 39.2 | Skill chip max width in search |
| #53 | `bfc8d8c` | Ticket 40 | Profile completeness nudges |
| #54 | `1bcf85b` | Ticket 41 | Tutor role + listing DB |
| #55 | `934ee3a` | Ticket 42 | Faculty page MVP |
| #56 | `281ae09` | Ticket 43 | Admin tutor management UI |
| #57 | `a4aeb56` | Ticket 44 | Courses + tutor assignments DB |
| #58 | `eaeb404` | Ticket 45 | Admin assign courses to tutors |
| #59 | `28230c6` | Ticket 46 | Faculty filter by course |
| #60 | `c3cf639` | Ticket 47 | Q&A tables DB |
| #61 | `7f06349` | Ticket 48 | Q&A routes UI |
| #62 | `05ad11a` | Ticket 48.1 | Q&A joins fix |
| #63 | `7de1149` | Ticket 49 | Q&A reply previews |
| #64 | `90a9474` | Ticket 50 | Direct new post link |
| #65 | `0cbbf33` | Ticket 51 | Dashboard unread messages badge |
| #66 | `c8bafa5` | Ticket 51D | Q&A activity badge |
| #67 | `a3e297d` | Ticket 52 | Online presence heartbeat |
| #68 | `0cd9e86` | Ticket 53 | Presence in messages + Q&A |
| #69 | `8aaf508` | UI-01 | Shared sidebar shell |
| #70 | `0b645f8` | UI-02 | Dashboard redesign |
| #71 | `1aba7cc` | UI-02.1 | Shell width + sidebar polish |
| #72 | `79020ac` | UI-02.1a | Sidebar active state fix + user block |
| #73 | `4107096` | UI-02.2 | Shared metrics provider |
| #74 | `d4ae1d3` | UI-03.1 | Profile completion banner |
| #75 | `c747a85` | UI-03.2 | My profile page polish |
| #76 | `ab7866f` | UI-03.3 | Messages redesign |
| #77 | `771e887` | UI-03.4 | New post redesign |
| #78 | `2cfa896` | UI-03.5 | Directory redesign |
| #79 | `71cfcc8` | UI-03.6 | Faculty redesign |
| #80 | `25d6bc3` | UI-03.7 | Questions list redesign |
| #81 | `ba6f418` | UI-03.8 | Question detail redesign |
| #82 | `a0f9abb` | UI-03.9 | Unified profile layout |
| #83 | `e0ecacb` | UI-04.0 | Feed + PostCard redesign |
| #84 | `8c20999` | UI-04.1 | Admin dashboard redesign |
| #85 | `76825b6` | SECURITY-AUDIT-01 | Security audit report |
| #86 | `1435d9f` | SEC-01 | Lock admin in middleware |
| #87 | `0ddb84f` | UI-04.2 | Batch signed URLs |
| #88 | `cfbb2cf` | UI-04.3 | Lazy media loading |
| #89 | `64e8c01` | UI-04.4 | Feed pagination |
| #90 | `80286e1` | UI-04.5 | Profile pagination |
| #91 | `adfdab8` | UI-04.6 | Admin pagination |
| #92 | `74b16c4` | DM-01 | Theme toggle |
| #93 | `fdf4de3` | DM-02 | Shell dark polish |
| #94 | `0dad692` | DM-03 | Shared components dark |
| #95 | `0173486` | DM-07 | Messages dark polish |
| #96 | `f9987be` | DM-06 | Profiles dark polish |
| #97 | `d55f658` | DM-08 | Directory + Faculty dark |
| #98 | `2745722` | DM-09 | Questions dark polish |
| #99 | `7d2a099` | DM-05 | Feed dark polish |
| #100 | `42c23f3` | UX-ADMIN-01 | Course dropdown portal |
| #101 | `654aab5` | DM-10 | Admin dark polish |
| #102 | `44350b7` | DM-11 | New post dark polish |
| #103 | `1f96b8b` | M-01 | Mobile bottom nav |
| #104 | `a7956a6` | M-02 | Mobile more menu |
| #105 | `29f2398` | M-03 | Messages mobile layout |
| #106 | `08a45f1` | M-04 | Mobile polish sweep |
| #107 | `5d9f7d5` | DM-11 (Auth) | Auth dark polish |
| #108 | `1bf5649` | M-06 | Directory CTA row |
| #109 | `86bf661` | BRAND-01 | Title + favicon |
| #110 | `ff606c8` | P-01 | Profile fields DB |
| #111 | `5148824` | P-02 | Profile read-only sections |
| #112 | `0ae771d` | P-03 | Editable profile fields |
| #113 | `9c78768` | P-04 | Profile completeness bonus |
| #114 | `0796282` | P-04.1 | Completeness all required |

</details>

---

*End of blueprint. All information sourced from repository code, migrations, ticket docs, and git history. Items marked "verify in dashboard" require manual Supabase dashboard confirmation.*
