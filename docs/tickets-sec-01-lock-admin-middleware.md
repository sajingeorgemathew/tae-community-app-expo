# Ticket SEC-01 — Lock /app/admin at middleware (server-side)

## Goal
Prevent non-admin users from loading /app/admin at all (server-side redirect), even though the Admin page already has client-side checks.

## Why
Client-side "Not Authorized" still allows:
- admin bundle download
- some reads may occur before UI blocks (depending on component behavior)
Server-side middleware gate reduces attack surface and improves UX.

## Scope
- Update `src/middleware.ts` only (plus any small helper if needed).
- Do NOT change DB schema.
- Do NOT change RLS.
- Keep existing `admin/page.tsx` client-side check as backup.

## Requirements
- If path starts with `/app/admin`:
  - Ensure authenticated.
  - Read `profiles.role` for `auth.uid()`.
  - If role !== 'admin' -> redirect to `/app` (or `/app?unauthorized=1` if already used).
- Continue existing checks (auth + is_disabled) as-is.
- Must not break other routes.

## Acceptance Tests
1. Member account:
   - Visiting `/app/admin` redirects to `/app` immediately.
   - Admin JS bundle should not load (check Network).
2. Admin account:
   - Visiting `/app/admin` loads normally.
3. Existing routes still work:
   - `/app`, `/app/feed`, `/app/messages`, `/app/questions` etc.

## Notes
- Keep the middleware query minimal (select role only).
- If middleware already fetches profile, extend select to include role.

---

## Implementation Notes

**File changed:** `src/middleware.ts`

**What was done:**
1. Extended the existing `profiles` query from `.select("is_disabled")` to `.select("is_disabled, role")` — no additional DB round-trip.
2. Added an admin gate after the `is_disabled` check: if `pathname.startsWith("/app/admin")` and `profile?.role !== "admin"`, redirect to `/app`.
3. If the profile row is missing (null), `profile?.role` is `undefined`, which is not `"admin"` — so missing profiles are treated as non-admin (redirected).
4. The existing client-side check in `admin/page.tsx` remains as a defense-in-depth backup.
5. No changes to DB schema, RLS, or matcher config.

**Diff summary (3 lines changed):**
- Line 27: updated comment to mention role
- Line 30: `.select("is_disabled")` → `.select("is_disabled, role")`
- Lines 40-44: new admin gate block

## How to Test

### Manual Test Checklist

1. **Non-admin user → `/app/admin`**
   - Log in as a member/tutor account
   - Navigate to `/app/admin` directly
   - Expected: immediately redirected to `/app` (no admin page flash, no admin JS bundle in Network tab)

2. **Non-admin user → `/app/admin/anything`**
   - Navigate to `/app/admin/some-subpath`
   - Expected: redirected to `/app`

3. **Admin user → `/app/admin`**
   - Log in as an admin account
   - Navigate to `/app/admin`
   - Expected: admin dashboard loads normally

4. **Unauthenticated user → `/app/admin`**
   - Log out, then navigate to `/app/admin`
   - Expected: redirected to `/login` (existing auth check fires first)

5. **Disabled user → `/app/admin`**
   - Mark an admin as disabled in DB, then try `/app/admin`
   - Expected: redirected to `/login?disabled=1` (disabled check fires before admin check)

6. **No profile row → `/app/admin`**
   - Create an auth user with no matching `profiles` row
   - Expected: redirected to `/app`

7. **Other routes unaffected**
   - Verify `/app`, `/app/feed`, `/app/messages`, `/app/questions`, `/app/me` all load normally for authenticated non-disabled users

8. **Network tab check**
   - As a non-admin, open DevTools Network tab, navigate to `/app/admin`
   - Verify the admin page JS chunk is NOT downloaded (302 redirect happens at middleware level)
