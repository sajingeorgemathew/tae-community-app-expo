Ticket 37.1 — Profile avatar/headline/skills visibility fix

Problem
After Ticket 37, updates are visible to the owner but other users still see old profile data or missing new fields.

Goal
Ensure /app/profile/[id], /app/directory, and any other profile preview surfaces fetch and display:
- avatar_path
- headline
- skills

Constraints
- Do not change DB schema or policies.
- Bucket profile-avatars is private => use signed URLs for avatar rendering.
- Avoid breaking existing profile/posts UI.
- No new dependencies.

Scope
Update reads/selects:
- src/app/app/profile/[id]/page.tsx
- src/app/app/directory/page.tsx
- (Optional) feed / post author preview if avatar is shown there later

Expected behavior
- User A updates avatar/headline/skills
- User B visits /app/profile/[A] and sees updated avatar/headline/skills
- Directory preview shows updated avatar + headline/skills if displayed
- No caching issues: profile page must be dynamic if needed

Done when
- Cross-account verification passes
- npm run build passes
