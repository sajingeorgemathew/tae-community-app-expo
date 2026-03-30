# Super-Admin Governance Blueprint

> Produced for ticket ADMIN-GOV-06A. This document defines the protected
> super-admin identity model, permission matrix, self-protection rules, and
> recommended implementation sequence. It does NOT implement any code or schema
> changes.

---

## 1. Problem Statement

The current admin system treats all admins as equals. Any admin can change
another admin's role, disable their account, or promote new admins without
restriction (apart from the UI guards added in ADMIN-GOV-02 and ADMIN-GOV-03).

This creates three risks:

1. **Admin power struggles** -- one admin demotes or disables another
2. **Accidental lockout** -- an admin removes their own or the last admin's
   access
3. **No owner-level accountability** -- no single account is guaranteed to
   always retain administrative control

A super-admin model resolves all three by establishing a protected
owner-level identity that cannot be modified through the application.

---

## 2. Recommended Super-Admin Identity Strategy

### 2.1 Decision: Environment-configured user-ID allowlist

**Use an environment variable (`SUPER_ADMIN_IDS`) containing a comma-separated
list of Supabase `auth.uid()` values.**

This is the recommended approach over the alternatives evaluated below.

### 2.2 Alternatives Evaluated

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Env-var user-ID allowlist** | Zero schema changes; trivial to bootstrap; cannot be escalated via app UI; works in all environments | Requires redeployment to change; limited to a small number of super-admins | **Recommended** |
| **B. Protected email allowlist** | Slightly more readable than UUIDs | Emails can change; requires extra lookup; less secure for identity | Rejected |
| **C. Dedicated DB role (`"super_admin"`)** | Runtime-manageable; query-friendly | Ripples through `ProfileRole` union, every role check, badges, RLS policies, and both apps; high blast radius | Rejected unless future need is proven |
| **D. Dedicated `super_admins` DB table** | Runtime-manageable; clean separation | Requires migration; adds query complexity; overkill for 1-3 super-admins | Deferred (Phase 3 option) |

### 2.3 Why user-ID allowlist wins

1. **No schema changes.** `ProfileRole` stays as `"member" | "tutor" | "admin"`.
   No new role value, no union expansion, no badge/color/RLS ripple.
2. **Immutable from the app.** Super-admin status cannot be granted or revoked
   through any UI or API endpoint. It requires a deployment or environment
   variable change. This is the strongest protection against privilege
   escalation.
3. **Simple to implement.** A single constant or env read, checked in a pure
   function: `isSuperAdmin(userId: string): boolean`.
4. **Compatible with current architecture.** The mobile app already uses
   session-based `auth.uid()` checks. The web middleware already fetches the
   user's profile. Adding a super-admin check is additive, not disruptive.
5. **Safe default.** If the env variable is missing or empty, no one is
   super-admin. All cross-admin blocks remain in effect. The system degrades
   to the current governance model.

### 2.4 Identity resolution

```
Super-admin identity check (pseudocode):

  SUPER_ADMIN_IDS = env("SUPER_ADMIN_IDS") ?? ""
  allowlist = SUPER_ADMIN_IDS.split(",").map(trim).filter(nonEmpty)

  isSuperAdmin(userId) = allowlist.includes(userId)
```

A super-admin is still `role = "admin"` in the database. The super-admin
designation is an overlay, not a replacement. This means:

- Super-admins appear as "Admin" in all UI surfaces
- Super-admins pass all existing `role === "admin"` checks
- The only behavioral difference is that cross-admin governance blocks are
  lifted for super-admins

---

## 3. Permission Matrix

```
Legend:
  Y  = Allowed
  N  = Blocked (UI + backend)
  S  = Super-admin only
  *  = Requires confirmation dialog
  -- = Not applicable

Action                                 | Member | Admin | Super-Admin
---------------------------------------|--------|-------|------------
View app content                       |   Y    |   Y   |     Y
Access admin panel                     |   N    |   Y   |     Y
View all members                       |   N    |   Y   |     Y
Change a member's role                 |   N    |  Y*   |    Y*
Disable/enable a member                |   N    |  Y*   |    Y*
Toggle a member's Instructor listing   |   N    |   Y   |     Y
Change another admin's role            |   N    |  N    |    S*
Disable/enable another admin           |   N    |  N    |    S*
Toggle another admin's Instructor list |   N    |   Y   |     Y
Promote a member to admin              |   N    |  Y*   |    Y*
Demote an admin to member/tutor        |   N    |  N    |    S*
Change own role                        |  --    |  N    |     N
Disable own account                    |  --    |  N    |     N
Toggle own Instructor listing          |  --    |  Y    |     Y
Grant super-admin status               |  --    |  N    |     N (ops-only)
Revoke super-admin status              |  --    |  N    |     N (ops-only)
Modify posts (moderation)              |   N    |   Y   |     Y
Manage course assignments              |   N    |   Y   |     Y
```

### 3.1 Key principles

1. **Super-admin is additive.** Everything an admin can do, a super-admin can
   also do. Super-admin unlocks the cross-admin actions that regular admins
   cannot perform.

2. **Self-governance applies equally.** Even super-admins cannot change their
   own role or disable their own account. This prevents accidental
   self-lockout.

3. **Super-admin status is ops-managed.** No one -- not even a super-admin --
   can grant or revoke super-admin status through the application. This
   requires changing the environment variable and redeploying.

4. **Instructor listing remains cosmetic.** Any admin (regular or super) can
   toggle any user's Instructor listing. It has no privilege implications.

---

## 4. Super-Admin Protections

### 4.1 Protection against external modification

| Threat | Protection |
|---|---|
| Regular admin demotes super-admin | Blocked: cross-admin governance blocks role changes on admin targets for non-super-admins |
| Regular admin disables super-admin | Blocked: cross-admin governance blocks disable on admin targets for non-super-admins |
| Another super-admin demotes this super-admin | Allowed with confirmation (they remain in the env allowlist, so re-promoting is trivial) |
| Another super-admin disables this super-admin | Allowed with confirmation (same reasoning) |
| App-level privilege escalation | Impossible: super-admin status is not stored in the database |

### 4.2 Protection against self-lockout

| Threat | Protection |
|---|---|
| Super-admin changes own role | Blocked: self-governance rule (same as all admins) |
| Super-admin disables own account | Blocked: self-governance rule (same as all admins) |
| Super-admin removes self from env allowlist | Out-of-app action; requires conscious deployment change |
| Last super-admin is removed | Ops-level concern; system degrades to current model (all cross-admin actions blocked) |

### 4.3 Safe degradation

If `SUPER_ADMIN_IDS` is empty, missing, or contains no valid UUIDs:

- No user is treated as super-admin
- All cross-admin protections remain active (regular admins cannot modify
  other admins)
- Self-governance rules remain active
- The system operates exactly as it does today post-ADMIN-GOV-03
- No errors, no crashes, no behavioral changes for non-admin users

This is the safest possible default. The system never fails open.

---

## 5. Cross-Admin Model with Super-Admin

### 5.1 What regular admins CAN do

- Manage all non-admin members (role changes, disable/enable, listing toggle)
- Promote members to admin (see 5.3 for discussion)
- Moderate posts
- Manage course assignments
- Toggle Instructor listing for any user including other admins

### 5.2 What regular admins CANNOT do

- Change another admin's role (blocked)
- Disable another admin's account (blocked)
- Change their own role (self-governance)
- Disable their own account (self-governance)
- Any action reserved for super-admin

### 5.3 Admin promotion policy

**Current recommendation: regular admins CAN promote members to admin.**

Rationale: In a small community app, requiring super-admin approval for every
new admin creates an operational bottleneck. Regular admins should be trusted
to grow the admin team. However, once someone is an admin, only a super-admin
can demote them. This is a reasonable trust boundary.

**Future option:** If admin promotion abuse becomes a concern, restrict
promotion to super-admin only. This is a single flag change and does not
require architectural changes.

### 5.4 Multi-super-admin scenarios

If multiple super-admins exist:

- Each can modify other admins (including other super-admins)
- Each is subject to the same self-governance rules
- Demoting another super-admin changes their DB role but does NOT remove them
  from the env allowlist. They can be re-promoted by any super-admin, or the
  env allowlist can be updated to remove them permanently.
- Recommended: keep the super-admin count to 1-3 for a community app of this
  scale.

---

## 6. Implementation Sequence

### Phase 1: Shared utility + mobile UI (no backend changes)

**Ticket: ADMIN-GOV-06B -- Super-admin identity utility**

Create a shared utility that resolves super-admin status:

```typescript
// packages/shared/src/auth/superAdmin.ts

const SUPER_ADMIN_IDS: string[] = (
  process.env.SUPER_ADMIN_IDS ?? ""
).split(",").map(s => s.trim()).filter(Boolean);

export function isSuperAdmin(userId: string): boolean {
  return SUPER_ADMIN_IDS.includes(userId);
}
```

For mobile (where `process.env` may not work as expected), use a build-time
constant injected via `app.config.ts` / `expo-constants`:

```typescript
// apps/mobile/src/lib/superAdmin.ts
import Constants from "expo-constants";

const SUPER_ADMIN_IDS: string[] = (
  Constants.expoConfig?.extra?.superAdminIds ?? ""
).split(",").map((s: string) => s.trim()).filter(Boolean);

export function isSuperAdmin(userId: string): boolean {
  return SUPER_ADMIN_IDS.includes(userId);
}
```

**Ticket: ADMIN-GOV-06C -- Mobile super-admin UI integration**

Update `AdminMemberDetailScreen.tsx` to use the super-admin check:

```typescript
// Current (ADMIN-GOV-03):
const crossAdminBlocked =
  !isSelf && myProfile?.role === "admin" && profile?.role === "admin";

// Updated:
const crossAdminBlocked =
  !isSelf &&
  myProfile?.role === "admin" &&
  profile?.role === "admin" &&
  !isSuperAdmin(session?.user?.id ?? "");
```

This lifts the cross-admin block for super-admins while preserving it for
regular admins. No other screen changes needed -- the governance logic is
already concentrated in this single screen.

### Phase 2: Backend enforcement

**Ticket: ADMIN-GOV-06D -- Backend super-admin enforcement**

Add Supabase RLS policies or RPC functions that enforce super-admin rules
server-side:

1. **Set the super-admin allowlist as a Supabase app setting:**
   ```sql
   ALTER DATABASE postgres SET app.super_admin_ids = 'uuid1,uuid2';
   ```

2. **Create a helper function:**
   ```sql
   CREATE OR REPLACE FUNCTION is_super_admin(uid UUID)
   RETURNS BOOLEAN AS $$
     SELECT uid = ANY(
       string_to_array(
         current_setting('app.super_admin_ids', true), ','
       )::uuid[]
     );
   $$ LANGUAGE sql STABLE SECURITY DEFINER;
   ```

3. **Update the profiles UPDATE RLS policy:**
   ```sql
   -- Only super-admins can modify profiles where target role = 'admin'
   CREATE POLICY "admin_profile_update" ON profiles FOR UPDATE USING (
     CASE
       WHEN (SELECT role FROM profiles WHERE id = profiles.id) = 'admin'
       THEN is_super_admin(auth.uid())
       ELSE (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
     END
   );
   ```

4. **Add self-governance enforcement:**
   ```sql
   -- No admin can modify their own role or is_disabled
   -- (enforced via trigger or CHECK, complementing the RLS policy)
   ```

### Phase 3: Web alignment

**Ticket: ADMIN-GOV-07 -- Web admin super-admin alignment**

Apply the same `isSuperAdmin()` check in the web admin page:

- Import the shared utility in `apps/web`
- Gate cross-admin controls the same way mobile does
- The web middleware already fetches the user profile; add the super-admin
  check alongside the existing role check
- No schema or API changes needed -- the same env variable is read server-side

### Phase 4: Optional DB table migration

**Ticket: ADMIN-GOV-08 -- Super-admin table (if needed)**

If the super-admin list grows beyond 3-5 users or runtime management becomes
necessary:

- Create a `super_admins` table with `user_id UUID PRIMARY KEY`
- Update `is_super_admin()` SQL function to query this table instead of the
  app setting
- Update the shared utility to query the table (or an RPC endpoint)
- Remove the env variable

This is explicitly deferred. The env-var approach is sufficient for the
foreseeable scale of this community app.

---

## 7. Terminology

The super-admin model does NOT introduce any new user-facing terminology.

| Context | What the user sees |
|---|---|
| Super-admin in the UI | "Admin" (same badge, same label) |
| Super-admin in the admin panel | Same admin panel, but cross-admin controls are unlocked |
| Super-admin in the database | `role = "admin"` (no new role value) |
| Super-admin in configuration | `SUPER_ADMIN_IDS` env variable (ops-only) |

The term "super-admin" is used only in:
- Internal documentation (this blueprint, tickets)
- Code comments and function names (`isSuperAdmin`)
- Developer-facing configuration (`SUPER_ADMIN_IDS`)

Users never see the term "super-admin". From their perspective, certain admins
simply have more capabilities.

---

## 8. Risks and Tradeoffs

### 8.1 Accepted tradeoffs

| Tradeoff | Why it's acceptable |
|---|---|
| Env-var requires redeployment to change | Super-admin changes are rare (onboarding a new owner). The friction is a feature, not a bug -- it prevents casual escalation. |
| No runtime super-admin management UI | Keeps the attack surface minimal. A management UI would itself need super-admin protection, creating a circular dependency. |
| Regular admins can still promote to admin | Acceptable for a small community. Can be restricted later with a one-line change. |
| Multi-super-admin role demotions are soft | Demoting a super-admin's DB role doesn't remove env-var status. This is acceptable because the env-var is the source of truth, and a demoted super-admin can simply re-promote themselves. Ops must update the env-var for a permanent removal. |

### 8.2 Mitigated risks

| Risk | Mitigation |
|---|---|
| Env-var misconfiguration | Safe default: empty/missing means no super-admin. System fails closed. |
| Single point of failure (one super-admin) | Recommend 2 super-admins minimum in production. Document this in deployment guide. |
| Super-admin account compromise | Out of scope for this model. Standard auth security (MFA, strong passwords) applies. Future: add audit logging (ADMIN-GOV-08). |
| Env-var leaked in logs/errors | UUIDs are not secret in the Supabase context (they're primary keys, not credentials). Leaking the allowlist does not grant access. |

---

## 9. Recommended Follow-Up Implementation Tickets

| # | Ticket | Scope | Dependencies |
|---|---|---|---|
| 1 | **ADMIN-GOV-06B** | Shared `isSuperAdmin()` utility + mobile config | This blueprint |
| 2 | **ADMIN-GOV-06C** | Mobile UI integration (lift cross-admin block for super-admins) | ADMIN-GOV-06B |
| 3 | **ADMIN-GOV-06D** | Backend RLS enforcement (super-admin-aware policies) | ADMIN-GOV-06B |
| 4 | **ADMIN-GOV-07** | Web admin alignment (apply same guards in `apps/web`) | ADMIN-GOV-06B |
| 5 | **ADMIN-GOV-08** | Admin action audit log | ADMIN-GOV-06D |
| 6 | **ADMIN-GOV-09** | Optional: `super_admins` DB table migration | ADMIN-GOV-06D, if scale demands |

Recommended order: 06B -> 06C -> 06D -> 07 -> 08. Ticket 09 is only if
the env-var approach proves insufficient.

---

## 10. Summary

The super-admin model is a **governance overlay**, not a schema change. It
uses an environment-configured user-ID allowlist to designate 1-3 owner-level
accounts that can manage other admins. The `ProfileRole` type, database
schema, and all existing role checks remain unchanged.

Key decisions:

1. **Identity:** Env-var `SUPER_ADMIN_IDS` (comma-separated UUIDs)
2. **DB role:** Remains `"admin"` -- no new role value
3. **Powers:** Everything a regular admin can do, plus cross-admin management
4. **Protections:** Cannot be modified through the app; self-governance applies
5. **Safe default:** Empty allowlist = no super-admin = current behavior
6. **Terminology:** "Super-admin" is internal-only; users see "Admin"

This approach was chosen because it is the simplest, safest, and most
compatible strategy for the current architecture. It requires zero schema
changes, zero RLS policy rewrites, and zero UI terminology changes. It can
be implemented incrementally (UI first, backend later) and upgraded to a
DB-backed model in the future if needed.
