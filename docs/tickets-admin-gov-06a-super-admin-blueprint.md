# ADMIN-GOV-06A — Super-admin protected identity blueprint

## Goal
Define the protected super-admin model before implementing super-admin-aware mobile/backend enforcement.

## Why
The current governance direction is clear:
- regular admins should not control other admins
- a higher-trust owner-like account should eventually exist
- this super-admin should be able to manage admins and all lower-level admin controls
- nobody should be able to demote/disable/remove the super-admin

Before implementing that in code, we need a clear blueprint.

## Scope
This ticket should:
1) define the super-admin model
2) define how super-admin is identified
3) define what powers super-admin has
4) define what protections apply to super-admin
5) define how mobile/backend/web should eventually consume that model
6) recommend the implementation sequence

## Explicitly included
- governance blueprint document
- permission matrix
- protected identity strategy recommendation
- follow-up implementation plan

## Explicitly NOT included
- No actual mobile implementation yet
- No backend migrations/policies yet
- No apps/web behavior changes
- No schema changes yet
- No audit log implementation yet

## Questions this blueprint must answer

### Super-admin identity model
- How should super-admin be identified?
- Recommended options to evaluate:
  - protected user-id allowlist
  - protected email allowlist
  - env-configured allowlist
  - dedicated DB role (likely NOT preferred unless strongly justified)
- Which option is safest and simplest for current architecture?

### Super-admin powers
- Can super-admin assign admin role?
- Can super-admin remove admin role?
- Can super-admin disable admins?
- Can super-admin edit admin-controlled fields?
- Can super-admin control all lower-level admin/member/instructor operations?

### Super-admin protections
- Can anyone disable the super-admin?
- Can anyone demote the super-admin?
- Can the super-admin accidentally demote themselves?
- Can the super-admin accidentally disable themselves?
- What self-protection rules apply?

### Cross-admin model after super-admin exists
- What can regular admins do to normal members?
- What can regular admins do to other admins? (expected: not much / blocked)
- What remains reserved only for super-admin?

### Implementation architecture
- What can be done in UI first?
- What must be enforced in backend/RLS/RPC eventually?
- How should mobile and separate web repo align later?

## Important implementation note
Claude must inspect:
- the current admin governance blueprint
- current admin UI guard decisions
- current profile role contract
- the practical limitations of the current architecture

The blueprint should strongly prefer:
- user-facing "Instructor" terminology
- keeping internal tutor-based schema/contracts unchanged where possible
- avoiding unnecessary schema role expansion unless clearly justified

## Existing context
Already working:
- admin shell
- member admin controls
- self-governance UI guards
- cross-admin UI guards
- admin dashboard summary
- current governance blueprint already exists
- super-admin is desired, but not implemented

## Expected output
This ticket should produce a blueprint document that includes:

1) Recommended super-admin identity strategy
2) Recommended permission matrix
3) Recommended self-protection rules
4) Recommended implementation sequence:
   - mobile UI
   - backend enforcement
   - later web alignment
5) Risks/tradeoffs of each approach
6) Clear recommendation for the actual path to use

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep changes documentation-heavy
- If any code changes exist, they should be minimal and non-behavioral

## Files likely to touch
- docs/tickets-admin-gov-06a-super-admin-blueprint.md
- docs/super-admin-governance-blueprint.md (new, recommended)

## Acceptance criteria
- A clear super-admin blueprint exists
- Identity model is explicitly recommended
- Permission matrix is defined
- Protection rules are defined
- Implementation sequence is defined
- No apps/web behavior changes
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit

## Manual review
1) Read the super-admin blueprint
2) Confirm it clearly answers:
   - who super-admin is
   - who can/cannot modify admins
   - who can/cannot modify super-admin
   - how implementation should be sequenced