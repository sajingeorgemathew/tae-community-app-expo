Ticket 38.3 — Admin dashboard: show avatars in Users + Posts sections

Goal
In /app/admin, wherever user rows or post author references are displayed, show the user’s avatar photo if available (otherwise initials fallback), matching the rest of the app.

Scope
Update only:

src/app/app/admin/page.tsx

Constraints / Safety

Do NOT change feed/directory/messages/profile pages (they already work)

Reuse existing shared components/helpers:

src/components/Avatar.tsx

src/lib/avatarUrl.ts (cached signed URL resolver)

Ensure admin queries include avatar_path

Resolve signed URLs using the cached helper (no request spam)

Keep existing admin functionality intact (disable user, delete posts, moderation controls)

Implementation Plan

Identify admin page data sources:

Users list query should select id, full_name, role, program, graduation_year, avatar_path (whatever fields you show)

Posts list query / join should include author profile’s avatar_path (either via join or lookup)

Resolve avatar URLs:

Use useAvatarUrls() or resolveAvatarUrls() pattern already used in Directory/Feed

Render avatars:

Users section: show <Avatar size="sm" ... /> next to name

Posts section: show <Avatar size="sm" ... /> next to author name/link

Make sure signing doesn’t loop:

Only sign when avatar_path exists

Use the cache helper so the same path is not signed repeatedly

Done when

Users table shows avatar image (or initials)

Posts section shows author avatar next to author name

Network tab shows no excessive signing requests

npm run build passes