# Admin Role Governance Blueprint

> Produced for ticket ADMIN-GOV-01. This document defines governance rules for
> admin powers, self-protection, cross-admin safety, super-admin design, and
> Instructor toggle semantics. It does NOT implement any code or schema changes.

---

## 1. Current State Summary

### What exists today

| Capability | Mobile | Web | Backend (RLS) |
|---|---|---|---|
| Admin role guard (route/screen) | Client-side check | Server middleware | Profile role check |
| View all members | Yes | Yes | SELECT open to all authenticated |
| Change any user's role | Yes | Yes | Any admin can UPDATE any profile |
| Toggle Instructor listing | Yes | Yes | Any admin can UPDATE any profile |
| Disable/enable account | Yes | Yes | Any admin can UPDATE any profile |
| Self-disable blocked | Yes (UI only) | Yes (UI only) | **Not enforced** |
| Self-role-change blocked | **No** | **No** | **Not enforced** |
| Self-Instructor-toggle blocked | **No** | **No** | **Not enforced** |
| Cross-admin protections | **None** | **None** | **None** |
| Super-admin concept | **None** | **None** | **None** |

### Current profile role contract

```
ProfileRole = "member" | "tutor" | "admin"
```

- DB constraint: `role IN ('member', 'tutor', 'admin', 'alumni')`
- `is_listed_as_tutor`: boolean, controls Faculty/Instructors page visibility
- `is_disabled`: boolean, soft-disable flag
- RLS: any row where the requesting user's role = `'admin'` can UPDATE any profile

### Current terminology mapping

| Context | Term |
|---|---|
| UI display (mobile + web) | **Instructor** |
| Internal DB column | `is_listed_as_tutor` |
| Internal role value | `"tutor"` |
| DB table | `tutor_course_assignments` |

This mapping is defined in `apps/mobile/src/lib/roles.ts` and documented in
SYS-01 / admin-mobile-blueprint. **Do not change internal schema names yet.**

---

## 2. Governance Rules

### 2.1 Self-Governance Rules

These rules prevent an admin from accidentally or intentionally removing their
own admin powers or disrupting their own account.

| Action | Rule | Enforcement |
|---|---|---|
| Admin changes own role | **BLOCKED** | UI-only now; backend-required later |
| Admin disables own account | **BLOCKED** | UI-only now; backend-required later |
| Admin toggles own Instructor listing | **ALLOWED** | No restriction needed |
| Admin edits own profile fields | **ALLOWED** | Normal self-edit (non-admin path) |

**Rationale:**

- **Self-role-change blocked:** An admin who accidentally sets themselves to
  `member` loses all admin access. Recovery requires another admin or direct DB
  intervention. This is the single most dangerous self-action.
- **Self-disable blocked:** Already implemented in mobile UI. Same reasoning as
  self-role-change -- recovery is difficult.
- **Self-Instructor-toggle allowed:** This is a display preference with no
  privilege implications. An admin who is also an Instructor should be able to
  toggle their own listing visibility. This is a low-risk cosmetic action.

### 2.2 Cross-Admin Governance Rules

These rules govern what one admin can do to another admin's account.

| Action | Current Admins | Super-Admin |
|---|---|---|
| Change another admin's role | **BLOCKED** | **ALLOWED** |
| Disable another admin's account | **BLOCKED** | **ALLOWED** |
| Toggle another admin's Instructor listing | **ALLOWED** | **ALLOWED** |
| Change a non-admin member's role | **ALLOWED** | **ALLOWED** |
| Disable a non-admin member | **ALLOWED** | **ALLOWED** |
| Toggle a non-admin's Instructor listing | **ALLOWED** | **ALLOWED** |

**Rationale:**

- Peer admins should NOT be able to demote or disable each other. This prevents
  admin power struggles and accidental lockouts. Only a super-admin should be
  able to modify another admin's role or account status.
- Instructor listing toggle for other admins is allowed because it is cosmetic
  and has no privilege impact.

### 2.3 Non-Admin Member Rules

Regular members and Instructors (tutor role) have no admin powers. Their
interactions are unaffected by this governance model. Any admin can manage any
non-admin member without restriction (beyond self-governance rules).

---

## 3. Super-Admin Model

### 3.1 Recommendation: Protected Allowlist (not a DB role)

**Do NOT add a `"super_admin"` role value to the database.** Instead, use a
protected allowlist strategy.

**Why:**

- Adding a new role value changes the `ProfileRole` union everywhere, ripples
  through all role checks, UI components, badge colors, and RLS policies.
- Super-admin is a governance concept, not a functional role. A super-admin is
  still an admin in every behavioral sense -- they just have additional
  protections and can perform protected actions.
- An allowlist is simpler, more secure, and easier to bootstrap.

### 3.2 Implementation Design

```
// Option A (recommended): Environment variable allowlist
SUPER_ADMIN_IDS=uuid1,uuid2

// Option B (future): Database table
CREATE TABLE super_admins (
  user_id UUID PRIMARY KEY REFERENCES profiles(id)
);
```

**Phase 1 (immediate, mobile UI):** Hard-code a `SUPER_ADMIN_IDS` constant or
environment variable. The mobile app checks this list to determine whether to
show/enable protected controls.

**Phase 2 (backend enforcement):** Create an RLS policy or database function
that checks the allowlist before allowing protected mutations:

```sql
-- Example: prevent admin role/disable changes unless requester is super-admin
CREATE POLICY "Only super-admins can modify admin profiles"
ON profiles FOR UPDATE
USING (
  -- If target is an admin, only super-admins can update role/is_disabled
  CASE
    WHEN (SELECT role FROM profiles WHERE id = profiles.id) = 'admin'
    THEN auth.uid() = ANY(string_to_array(
      current_setting('app.super_admin_ids', true), ','
    )::uuid[])
    ELSE (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  END
);
```

**Phase 3 (optional, long-term):** Migrate to a `super_admins` table if the
allowlist grows or needs runtime management.

### 3.3 Super-Admin Privileges

| Action | Regular Admin | Super-Admin |
|---|---|---|
| Manage non-admin members | Yes | Yes |
| Change another admin's role | **No** | Yes |
| Disable another admin | **No** | Yes |
| Promote a member to admin | Yes | Yes |
| Demote an admin to member | **No** | Yes |
| Change own role | **No** | **No** |
| Disable own account | **No** | **No** |
| Remove super-admin status | N/A | **No** (requires DB/env change) |
| Add new super-admin | N/A | **No** (requires DB/env change) |

**Key principle:** Super-admin status cannot be granted or revoked through the
app UI. It requires a deployment/database change. This is intentional -- it
prevents privilege escalation through the admin interface.

### 3.4 Super-Admin Self-Protection

Even a super-admin cannot:

- Change their own role (same self-governance rule as regular admins)
- Disable their own account
- Remove their own super-admin status via UI

Super-admin status changes are an **operations-level action**, not an
app-level action.

---

## 4. Instructor Toggle Governance

### 4.1 Semantics

The Instructor listing (`is_listed_as_tutor`) is a **display toggle**, not a
privilege. It controls whether a user appears on the Faculty/Instructors page.
It does not grant any special permissions.

### 4.2 Rules

| Scenario | Rule |
|---|---|
| Admin toggles own Instructor listing | **ALLOWED** |
| Admin toggles another admin's Instructor listing | **ALLOWED** |
| Admin toggles a non-admin's Instructor listing | **ALLOWED** |
| Instructor listing auto-cleared on demotion to member | **REQUIRED** (already implemented) |
| Instructor listing requires role = tutor | **RECOMMENDED** (see coupling rule) |

### 4.3 Role-Listing Coupling

The Instructor listing toggle should only be meaningful (and only shown as
enabled) when `role = "tutor"`. When role is changed to `"member"`, the listing
must be forced to `false`.

This coupling is already implemented in web admin (`apps/web/src/app/app/admin/page.tsx`,
line ~843). **Mobile should also enforce this** -- the toggle should be disabled
(grayed out) when the selected role is not `"tutor"`.

Current mobile behavior: the Instructor listing toggle is always enabled
regardless of selected role. This is a gap that should be fixed.

### 4.4 Admin + Instructor Combo

An admin whose role is `"admin"` (not `"tutor"`) should NOT appear on the
Instructors page. If an admin also teaches, they need role = `"tutor"` to be
listed. Since `ProfileRole` is a single value (not a bitmask), an admin who
teaches must choose between `"admin"` and `"tutor"`.

**Recommendation for future:** Consider whether admins who teach need a separate
mechanism. For now, this is acceptable -- admins who teach can be listed as
Instructors by having their role set to `"tutor"` (they would lose admin access).
A future ticket could explore a `is_admin` boolean flag separate from role, but
this is out of scope.

---

## 5. UI vs Backend Enforcement Matrix

### 5.1 What MUST be enforced at backend level (eventually)

These rules have security implications. UI-only enforcement is insufficient
because a malicious or buggy client could bypass it.

| Rule | Why Backend Required |
|---|---|
| Admin cannot change own role | Prevents privilege lockout via API call |
| Admin cannot disable own account | Prevents self-lockout via API call |
| Regular admin cannot change another admin's role | Prevents admin power struggles via API |
| Regular admin cannot disable another admin | Same as above |
| Super-admin allowlist check | Prevents privilege escalation |
| Instructor listing forced false on demotion to member | Data consistency |
| Only admins can perform admin updates | Already enforced via RLS |

### 5.2 What can remain UI-only (safe as UI guards)

These are cosmetic or UX-quality rules where backend enforcement is not
strictly necessary for security.

| Rule | Why UI-Only is Acceptable |
|---|---|
| Instructor toggle disabled when role != tutor | UX guidance, not security |
| Confirmation dialogs before destructive actions | UX safety net |
| "This is your account" indicator | Informational only |
| Hide admin controls from non-admins | UX (RLS already blocks the mutation) |

### 5.3 Recommended Confirmation Dialogs

The following actions should require explicit confirmation (Alert/modal):

| Action | Confirmation Message |
|---|---|
| Changing a user's role | "Change [name]'s role from [old] to [new]?" |
| Disabling an account | "Disable [name]'s account? They will lose app access." |
| Enabling a disabled account | "Re-enable [name]'s account?" |
| Promoting to admin | "Grant admin access to [name]? This gives full admin powers." |
| Demoting an admin (super-admin only) | "Remove admin access from [name]?" |

---

## 6. Permission Matrix Summary

```
Legend:
  Y = Allowed
  N = Blocked
  S = Super-admin only
  * = Requires confirmation dialog

Action                              | Self | Other Member | Other Admin
------------------------------------|------|--------------|------------
Change role to member               |  N   |    Y*        |    S*
Change role to tutor (Instructor)   |  N   |    Y*        |    S*
Change role to admin                |  N   |    Y*        |    S*
Disable account                     |  N   |    Y*        |    S*
Enable account                      |  N   |    Y         |    S
Toggle Instructor listing           |  Y   |    Y         |    Y
View member details                 |  Y   |    Y         |    Y
```

---

## 7. Recommended Implementation Sequence

### Phase 1: Mobile UI Guards (no backend changes)

**Ticket: ADMIN-GOV-02 — Implement self-governance UI guards**

- Block self-role-change in `AdminMemberDetailScreen` (disable role selector when `isSelf`)
- Add confirmation dialogs for role changes, disable/enable actions
- Disable Instructor listing toggle when selected role != `"tutor"`
- Add "self-protection" visual indicators

**Ticket: ADMIN-GOV-03 — Implement cross-admin UI guards**

- Detect when target user is an admin
- Block role change and disable toggle for admin targets (unless super-admin)
- Add `SUPER_ADMIN_IDS` constant/env variable
- Show "requires super-admin" message for blocked actions
- Allow Instructor listing toggle regardless of admin status

### Phase 2: Backend Enforcement

**Ticket: ADMIN-GOV-04 — Backend self-governance enforcement**

- Add RLS policy or database function to prevent self-role-change
- Add RLS policy or database function to prevent self-disable
- Add trigger to force `is_listed_as_tutor = false` when role changes to `"member"`

**Ticket: ADMIN-GOV-05 — Backend cross-admin enforcement**

- Add super-admin allowlist mechanism (env variable or DB table)
- Add RLS policy: only super-admins can UPDATE profiles where target role = `'admin'`
- Add RLS policy: only super-admins can change a profile's role TO `'admin'` (promotion) -- or decide if regular admins can promote

**Ticket: ADMIN-GOV-06 — Backend Instructor listing enforcement**

- Add DB trigger: when `role` is updated to `'member'`, set `is_listed_as_tutor = false`
- Add CHECK constraint or trigger: `is_listed_as_tutor = true` requires `role = 'tutor'`

### Phase 3: Web Alignment

**Ticket: ADMIN-GOV-07 — Align web admin with governance rules**

- Apply same self-governance and cross-admin guards to web admin page
- Add confirmation dialogs to match mobile behavior
- Integrate super-admin allowlist check

### Phase 4: Audit and Logging (future)

**Ticket: ADMIN-GOV-08 — Admin action audit log**

- Create `admin_audit_log` table
- Log all admin actions (role changes, disable/enable, listing toggles)
- Include: actor_id, target_id, action, old_value, new_value, timestamp
- Useful for accountability and debugging governance violations

---

## 8. Open Questions for Future Decision

1. **Admin + Instructor dual identity:** Should we eventually support a user
   being both admin and Instructor simultaneously? This would require either a
   bitmask role system or a separate `is_admin` boolean. Recommended: defer
   until there is a concrete use case.

2. **Admin promotion governance:** Should a regular admin be able to promote a
   member to admin? Currently yes (no restriction). Consider whether this should
   also be super-admin-only. Recommendation: allow for now, restrict later if
   needed.

3. **Alumni role governance:** The DB supports `"alumni"` as a role value but
   it is not in the `ProfileRole` TypeScript union. Define governance rules for
   alumni when this role is activated.

4. **Multi-super-admin scenarios:** If multiple super-admins exist, can one
   super-admin demote another? Recommendation: yes, with confirmation. The
   super-admin allowlist itself is the source of truth, not the role field.

---

## 9. Terminology Reference

For consistency across all future governance tickets:

| Term | Meaning |
|---|---|
| **Admin** | User with `role = "admin"`. Full management powers. |
| **Super-admin** | Admin whose user ID is in the protected allowlist. Can manage other admins. |
| **Instructor** | User with `role = "tutor"` AND `is_listed_as_tutor = true`. Appears on Faculty page. |
| **Instructor listing** | The `is_listed_as_tutor` boolean. Display toggle, not a privilege. |
| **Member** | User with `role = "member"`. Standard app access. |
| **Disabled** | User with `is_disabled = true`. Cannot access the app. |
| **Self-governance** | Rules preventing an admin from modifying their own admin status. |
| **Cross-admin governance** | Rules preventing peer admins from modifying each other. |
| **Protected action** | Any action that requires super-admin status. |

---

## 10. Summary

This governance blueprint establishes three key principles:

1. **Self-protection is mandatory.** No admin can remove their own admin powers
   or disable their own account, whether through UI or API.

2. **Peer-admin changes require super-admin.** Regular admins can manage members
   and Instructors, but cannot modify other admins. This prevents power struggles
   and accidental lockouts.

3. **Super-admin is an operations concept, not a UI concept.** Super-admin
   status is granted through environment/database configuration, not through the
   app. This makes it impossible to escalate privileges through the admin
   interface.

The Instructor listing remains a simple display toggle with no privilege
implications. It follows role coupling (requires `role = "tutor"`) but is
otherwise freely manageable by any admin.

Implementation should proceed in phases: UI guards first (immediate safety),
then backend enforcement (durable safety), then web alignment, then audit
logging.
