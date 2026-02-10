Ticket 38 — Show avatar everywhere it matters (feed + directory + profile header + quick search console)

Goal

Make the app look premium instantly by showing profile avatars consistently across:

Feed (next to author)

Directory (next to each person)

Directory quick search console preview list

Profile header (large avatar + headline + skills)
With solid fallbacks (initials) and no layout break.

Scope

Reusable Avatar component

Create: src/components/Avatar.tsx

Props:

fullName: string

avatarUrl?: string | null

size?: "sm" | "md" | "lg"

optional className

Behavior:

If avatarUrl exists → render <img>

Else → initials fallback circle

Must be stable:

fixed size, rounded-full, object-cover, shrink-0

Signed URL helper + caching

Bucket profile-avatars is private.

Need signed URLs via Supabase storage.from("profile-avatars").createSignedUrl(...)

Avoid request spam:

Build in-memory Map cache inside each page that needs it (or a small helper module).

Reuse signed URLs for identical avatar_path during that page session.

Feed

Show avatar next to author name link on each post.

Must not change feed ranking/filters logic.

Ensure no overflow or card misalignment.

Directory

Show avatar next to each profile row/card.

If it already exists, ensure it uses the Avatar component + fallback initials.

Also update directory quick search console preview list to show avatars.

Profile page

Show large avatar in the header area.

Show headline under name (if exists).

Show skills as small tags if present.

Must not break existing profile view and posts list.

Done when

Avatars show across Feed + Directory + Quick Search + Profile header

Initials appear when no avatar

No layout breaking

No request spam loops (use caching)

npm run build passes

✅ Why safe: Presentation-only + signed URL fetching, no DB changes.