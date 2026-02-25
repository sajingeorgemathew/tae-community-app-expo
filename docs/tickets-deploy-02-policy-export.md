# DEPLOY-02 — Export Supabase policies to repo + fix convo membership insert

## Goal
1) Encode current Supabase RLS + storage policies into SQL migrations so the repo is the source of truth.
2) Fix the security issue where users can insert themselves into any conversation via `conversation_members`.

## Why
- Policies configured only in the dashboard can drift and are hard to audit.
- Current `conversation_members` INSERT policy only checks `user_id = auth.uid()` and does not verify the user is allowed to join that conversation.

## Scope
- public.profiles: export current policies as-is (no behavior loosening)
- storage.objects: export current policies as-is
- public.conversation_members: tighten INSERT to prevent unauthorized joins

## Safety constraints
- No breaking schema changes
- Preserve expected behavior for:
  - profile view/update
  - posts
  - messages read/send
  - avatar uploads
  - post media uploads
  - message media access (already gated by membership)
- Do NOT loosen admin controls

## Files added

| File | Purpose |
|------|---------|
| `supabase/migrations/20250218_deploy02_profiles_rls_policies.sql` | Profiles RLS: enable RLS + 5 policies (select all, insert own, update own, admin update, admin delete) |
| `supabase/migrations/20250219_deploy02_storage_policies_export.sql` | Storage policies for post-media (read/upload/delete), profile-avatars (read/upload/update/delete), message-media (member read/upload, sender delete) |
| `supabase/migrations/20250220_deploy02_fix_conversation_members_insert.sql` | Tightened conversation_members INSERT policy |

## Policy details

### profiles (20250218)
| Policy | Operation | Logic |
|--------|-----------|-------|
| Authenticated users can view all profiles | SELECT | `true` (any authenticated user) |
| Users can insert their own profile | INSERT | `id = auth.uid()` |
| Users can update their own profile | UPDATE | USING + WITH CHECK: `id = auth.uid()` |
| Admins can update any profile | UPDATE | USING + WITH CHECK: caller `role = 'admin'` |
| Only admins can delete profiles | DELETE | caller `role = 'admin'` |

### storage.objects (20250219)

**post-media** (public bucket):
| Policy | Operation | Logic |
|--------|-----------|-------|
| Authenticated can read post media | SELECT | `bucket_id = 'post-media'` |
| Authenticated can upload post media | INSERT | `bucket_id = 'post-media'` |
| Uploader or admin can delete media | DELETE | `bucket_id = 'post-media'` AND (uploader via `post_attachments` OR admin) |

**profile-avatars** (private bucket):
| Policy | Operation | Logic |
|--------|-----------|-------|
| Authenticated users can read profile avatars | SELECT | `bucket_id = 'profile-avatars'` |
| Users can upload their own avatar | INSERT | `bucket_id = 'profile-avatars'` AND `is_avatar_path_owner(name)` |
| Users can update their own avatar | UPDATE | `bucket_id = 'profile-avatars'` AND `is_avatar_path_owner(name)` |
| Users can delete their own avatar | DELETE | `bucket_id = 'profile-avatars'` AND `is_avatar_path_owner(name)` |

**message-media** (private bucket):
| Policy | Operation | Logic |
|--------|-----------|-------|
| Members can view message media | SELECT | `bucket_id = 'message-media'` AND user is conversation member |
| Members can upload message media | INSERT | `bucket_id = 'message-media'` AND path starts with `messages/` AND user is conversation member |
| Message sender can delete media | DELETE | `bucket_id = 'message-media'` AND user is message sender (via `message_attachments` + `messages`) |

### conversation_members INSERT fix (20250220)

**Before (insecure):**
```sql
with check (user_id = auth.uid())
```
Any authenticated user could add themselves to ANY conversation.

**After (fixed):**
```sql
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.conversation_members
    where conversation_id = conversation_members.conversation_id
      and user_id = auth.uid()
  )
)
```
Direct INSERT now requires the user to already be a member of the conversation. This effectively blocks unauthorized joins. Legitimate conversation creation still works because `create_conversation_1to1` is a `SECURITY DEFINER` function that bypasses RLS.

**Note:** The `conversations` table has no `created_by` column, so creator-based authorization is not possible. The existing membership check is sufficient because all initial memberships are created through the RPC.

SELECT and DELETE policies are unchanged.

## Acceptance criteria
- Migrations exist that recreate:
  - profiles RLS + policies
  - storage.objects policies for post-media, profile-avatars, message-media
  - conversation_members policies (with fixed INSERT)
- Security:
  - A user cannot add themselves to a conversation unless allowed by membership rules
- Build:
  - npx tsc --noEmit
  - npm run build

## Verification steps

### 1. Build verification
```bash
npx tsc --noEmit
npm run build
```

### 2. SQL verification (run in Supabase SQL Editor)

**Check profiles policies:**
```sql
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'profiles';
```

**Check storage policies:**
```sql
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'objects'
order by policyname;
```

**Check conversation_members policies:**
```sql
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'conversation_members';
```

### 3. Functional smoke tests

**conversation_members INSERT fix:**
1. As user A: create conversation with user B via the app (uses RPC) — should succeed
2. As user C: attempt direct INSERT into conversation_members for user A's conversation — should fail with RLS violation
3. Existing conversations: verify messages can still be sent/read

**Profiles:**
1. View any profile — should work
2. Update own profile — should work
3. Update other user's profile (non-admin) — should fail
4. Delete profile (non-admin) — should fail

**Storage:**
1. Upload post media — should work
2. Upload avatar — should work (own path only)
3. View message media as conversation member — should work
4. View message media as non-member — should fail

## Test plan
1) Local:
   - npx tsc --noEmit
   - npm run build
2) Supabase SQL verification:
   - Confirm only conversation creator (or existing member) can add members (depending on chosen rule below)
3) App smoke:
   - Create conversation
   - Add member (expected path still works)
   - Confirm user cannot join random conversation IDs
