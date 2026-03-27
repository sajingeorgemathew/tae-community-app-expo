# Admin Mobile Blueprint

> Generated from ADMIN-01A audit of `apps/web/src/app/app/admin/page.tsx` and related files.
> This document inventories the web admin area and proposes a mobile-first admin information architecture.

---

## 1. Admin Feature Inventory

The web admin dashboard lives in a single page (`apps/web/src/app/app/admin/page.tsx`, ~65 KB) with three major sections and several cross-cutting concerns.

### 1A. Posts Moderation

| Feature | Type | Description |
|---------|------|-------------|
| Post feed with filters | Read | Recent posts filtered by audience (all / students / alumni) and time window (1h / 2h / 3h / 24h) |
| Single post delete | Action | Delete a post plus its attachments (storage cleanup) and reactions |
| Bulk select posts | Action | "Select all visible" checkbox + individual checkboxes |
| Bulk delete posts | Action | Delete all selected posts in one operation |
| Delete posts by selected users | Action | Delete all posts authored by a set of selected users within the active time window |
| Reaction toggle (test) | Action | Add/remove emoji reactions on posts (appears to be a testing/debug tool) |

**Backend dependencies:**
- `posts` table (RLS: admin can DELETE any row)
- `post_attachments` table + `post-media` storage bucket (cascade cleanup)
- `post_reactions` table (cascade cleanup)
- `profiles` table (author info join)

### 1B. Instructor / Tutor Management

> **Terminology note (SYS-01):** Display as "Instructor" in UI. Internal schema column is `is_listed_as_tutor`, table is `tutor_course_assignments`, role value is `"tutor"`. These remain unchanged.

| Feature | Type | Description |
|---------|------|-------------|
| Instructor list with search | Read | All users displayed; searchable by name |
| Role editing | Action | Change a user's role (`member` / `tutor` / `admin` / `alumni`) |
| Listing toggle | Action | Toggle `is_listed_as_tutor`; forced `false` when role is `member` |
| Course assignment | Action | Multi-select dropdown to assign/unassign courses per instructor |
| Per-instructor save | Action | Persist role + listing + course changes individually with status feedback |

**Backend dependencies:**
- `profiles` table — `role`, `is_listed_as_tutor` columns (RLS: admin UPDATE)
- `courses` table — `id`, `code`, `title`, `is_active` (RLS: admin-only CRUD)
- `tutor_course_assignments` table — `tutor_id`, `course_id` (RLS: admin-only INSERT/DELETE)

### 1C. Users Management

| Feature | Type | Description |
|---------|------|-------------|
| User list with search | Read | All users; searchable by name, program, grad year, or role |
| Disable / enable user | Action | Toggle `is_disabled` on a single user (disabled users are blocked at middleware) |
| Bulk select users | Action | Checkboxes for multi-select |
| Bulk disable users | Action | Disable multiple users at once (self excluded) |
| Bulk delete posts by users | Action | Delete all posts by selected users within the time window |

**Backend dependencies:**
- `profiles` table — `is_disabled` column (RLS: admin UPDATE)
- `posts` table (for bulk post deletion by author)
- Middleware `is_disabled` check redirects to `/login?disabled=1`

### 1D. Cross-Cutting Concerns

| Concern | Details |
|---------|---------|
| **Auth guard** | Web middleware blocks non-admin from `/app/admin`; mobile `guards.ts` lists `"Admin"` in `PROTECTED_ROUTE_PREFIXES` |
| **Pagination** | Posts: 20 per page; Users: 25 per page; "Load more" pattern |
| **Avatar resolution** | `useAvatarUrls()` hook generates signed URLs from `avatar_path` |
| **Loading states** | Per-action loading flags: `bulkDeleting`, `bulkDisabling`, `deletingUserPosts`, `togglingUser`, `savingTutor`, `savingCourses` |
| **Status feedback** | `tutorSaveStatus[userId]` and `courseSaveStatus[userId]` show success/error per row |
| **Self-protection** | Admin cannot disable themselves; filtered out of bulk disable |

---

## 2. Mobile-First Information Architecture

### Proposed Navigation

```
Admin (tab or settings entry point)
  |
  +-- Dashboard (landing)
  |     - Member count summary
  |     - Recent flagged / reported content (future)
  |     - Quick links to sub-sections
  |
  +-- Members
  |     - Searchable member list
  |     - Tap member -> Member detail sheet
  |       - View profile summary
  |       - Change role (member / tutor / admin / alumni)
  |       - Toggle instructor listing
  |       - Disable / enable account
  |
  +-- Instructors
  |     - Filtered view (role = tutor or is_listed_as_tutor)
  |     - Tap instructor -> Instructor detail sheet
  |       - Role & listing controls (same as Members detail)
  |       - Course assignment list with toggles
  |
  +-- Posts Moderation
  |     - Audience + time filters
  |     - Swipe-to-delete or long-press actions
  |     - Bulk select mode with toolbar
  |
  +-- (Future) Courses Management
  +-- (Future) Invites & Operations
  +-- (Future) Metrics & Activity
```

### Key Mobile Adaptations

1. **Split the monolith page into separate screens.** The web admin is a single scrollable page with three stacked sections. Mobile should use separate screens/tabs for Members, Instructors, and Posts Moderation.

2. **Detail sheets instead of inline editing.** The web uses inline table editing (role dropdowns, course multi-selects). Mobile should use bottom sheets or detail screens with dedicated controls.

3. **Swipe and long-press for actions.** Replace bulk checkboxes with swipe-to-act gestures and a "select mode" toggle for bulk operations.

4. **Confirmation modals for destructive actions.** The web currently lacks confirmation dialogs for post deletion and user disabling. Mobile should add these.

5. **Pull-to-refresh instead of manual reload.** Standard mobile pattern for list screens.

6. **Instructor terminology (SYS-01).** All user-facing labels say "Instructor". Internal code continues to use `tutor` in schema, column names, and API contracts.

---

## 3. Priority Ranking

### Must-Have (Mobile Phase 1)

| Feature | Rationale |
|---------|-----------|
| Admin route guard | Security — must block non-admins before any admin screen ships |
| Member list + search | Core admin need; most-used admin action is looking up a user |
| Member detail: view profile | Foundation for all per-member actions |
| Member detail: change role | Critical operational action (promote/demote) |
| Member detail: disable/enable | Safety action to block abusive users from mobile |
| Instructor list (filtered members) | Instructors are a key persona; need a dedicated view |
| Instructor detail: listing toggle | Controls directory visibility |
| Instructor detail: course assignment | Frequently used at semester boundaries |

### Should-Have (Mobile Phase 2)

| Feature | Rationale |
|---------|-----------|
| Posts moderation feed | Useful but less urgent — feed moderation partly exists via owner actions on posts |
| Single post delete (admin) | Complements existing post owner-delete |
| Audience + time filters | Needed for effective moderation at scale |
| Admin landing / dashboard summary | Nice entry point but not blocking |
| Bulk disable users | Rare but important for incident response |

### Defer / Web-Only (Phase 3+)

| Feature | Rationale |
|---------|-----------|
| Bulk post deletion | Complex UX on mobile; rare need |
| Delete posts by selected users | Advanced moderation; web is better for batch ops |
| Reaction toggle (test tool) | Debug/testing tool, not production admin need |
| Course CRUD (add/edit/archive) | Not yet in web admin either; out of scope |
| Invite management | Not yet implemented in web admin |
| Metrics / analytics dashboard | Not yet implemented in web admin |
| Audit logging | Not yet implemented anywhere |

---

## 4. Recommended Implementation Order

### Ticket 1: ADMIN-01B — Admin route shell + guard

**Scope:** Create the admin tab/entry point in mobile navigation. Implement role-based guard so only `role === "admin"` users see and access admin screens. Show a minimal "Admin" landing screen.

**Files likely touched:**
- `apps/mobile/src/navigation/` — add Admin stack/tab
- `packages/shared/src/auth/guards.ts` — verify mobile admin guard
- `apps/mobile/src/screens/admin/AdminLanding.tsx` — new screen

**Dependencies:** None (existing auth + profile context)

---

### Ticket 2: ADMIN-02 — Member list + member detail

**Scope:** Searchable member list screen. Tap a member to open a detail sheet showing profile summary, role selector, instructor listing toggle, and disable/enable control.

**Files likely touched:**
- `apps/mobile/src/screens/admin/MemberList.tsx` — new screen
- `apps/mobile/src/screens/admin/MemberDetail.tsx` — new screen or bottom sheet
- Supabase queries against `profiles` table

**Dependencies:** ADMIN-01B (admin shell + guard)

**Backend notes:** All needed RLS policies already exist. Direct Supabase client queries are sufficient (same pattern as web).

---

### Ticket 3: ADMIN-03 — Instructor list + course assignment

**Scope:** Instructor-filtered member list. Instructor detail sheet adds course assignment toggles. Respects SYS-01 terminology ("Instructor" displayed, `tutor` in schema).

**Files likely touched:**
- `apps/mobile/src/screens/admin/InstructorList.tsx` — new screen
- `apps/mobile/src/screens/admin/InstructorDetail.tsx` — new screen or bottom sheet
- Supabase queries against `courses`, `tutor_course_assignments`

**Dependencies:** ADMIN-02 (member detail pattern established)

**Backend notes:** `courses` and `tutor_course_assignments` tables + RLS policies already exist.

---

### Ticket 4: ADMIN-04 — Posts moderation

**Scope:** Admin posts feed with audience and time filters. Single-post delete with confirmation. Basic bulk select + delete.

**Files likely touched:**
- `apps/mobile/src/screens/admin/PostsModeration.tsx` — new screen
- Reuse existing `PostCard` component with admin action overlay
- Supabase queries against `posts`, `post_attachments`, `post_reactions`

**Dependencies:** ADMIN-01B (admin shell)

**Backend notes:** Admin DELETE policy on `posts` already exists. Storage cleanup logic for `post-media` bucket needed.

---

### Ticket 5: ADMIN-05 — Admin dashboard summary

**Scope:** Populate the admin landing screen with summary cards: total members, active instructors, recent posts count, disabled users count. Quick-link buttons to each sub-section.

**Files likely touched:**
- `apps/mobile/src/screens/admin/AdminLanding.tsx` — enhance with summary queries
- Lightweight aggregate Supabase queries

**Dependencies:** ADMIN-02, ADMIN-03, ADMIN-04 (sub-screens must exist to link to)

---

### Ticket 6: ADMIN-06 — Bulk operations + advanced moderation

**Scope:** Bulk user disable, bulk post deletion, delete-posts-by-user. These are lower-frequency operations better suited to a later phase.

**Dependencies:** ADMIN-02, ADMIN-04

---

## 5. Backend / Query Dependency Summary

| Admin Feature | Table(s) | RLS Policy Exists? | Mobile-Ready? |
|---------------|----------|-------------------|---------------|
| Member list + search | `profiles` | Yes (admin SELECT/UPDATE) | Yes — direct Supabase query |
| Role change | `profiles.role` | Yes (admin UPDATE) | Yes |
| Disable user | `profiles.is_disabled` | Yes (admin UPDATE) | Yes |
| Instructor listing toggle | `profiles.is_listed_as_tutor` | Yes (admin UPDATE) | Yes |
| Course list | `courses` | Yes (admin SELECT) | Yes |
| Course assignment | `tutor_course_assignments` | Yes (admin INSERT/DELETE) | Yes |
| Post list + filters | `posts` + `profiles` join | Yes (admin SELECT) | Yes |
| Post delete + cleanup | `posts`, `post_attachments`, `post_reactions`, storage | Yes (admin DELETE) | Yes — needs storage cleanup util |
| User disable middleware | `profiles.is_disabled` | N/A (middleware) | Partial — mobile guard in `guards.ts` needs verification |

All core admin features are backed by existing Supabase RLS policies. No new migrations are needed for Phase 1-2. The mobile app can query Supabase directly using the same patterns as the web app.

---

## 6. Terminology Alignment (SYS-01)

| Context | Term |
|---------|------|
| UI labels, screen titles, button text | **Instructor** |
| Database columns | `is_listed_as_tutor` (unchanged) |
| Database tables | `tutor_course_assignments` (unchanged) |
| Profile role enum value | `"tutor"` (unchanged) |
| Variable names in code | `tutor` acceptable internally |

All new mobile admin screens must display "Instructor" in user-facing text while preserving the existing `tutor` schema contracts.

---

## 7. Security Considerations for Mobile

1. **Route guard is non-negotiable** — must ship before any admin screen.
2. **Self-protection** — admin cannot disable or demote themselves.
3. **Confirmation dialogs** — all destructive actions (delete, disable) require explicit confirmation on mobile.
4. **Optimistic updates with rollback** — if a Supabase mutation fails, revert UI state and show error.
5. **Offline handling** — admin screens should require connectivity; show clear offline state rather than stale data.
