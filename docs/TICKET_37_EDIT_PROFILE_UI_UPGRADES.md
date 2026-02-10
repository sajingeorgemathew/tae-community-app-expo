Ticket 37 — Edit Profile UI upgrades (headline + skills + avatar upload)

Goal
Let a user update avatar, headline, and skills from /app/me using the existing Edit/Save flow.

Scope
Update ONLY:
- src/app/app/me/page.tsx (or the existing /app/me profile editor file in this repo)

Avatar upload UI
- Show current avatar preview (round). If no avatar set, show placeholder circle.
- On Edit mode: allow selecting an image file.
- Validate before upload:
  - Allowed MIME: image/jpeg, image/png, image/webp
  - Max size: 5MB
- Upload to Supabase Storage bucket: profile-avatars
- IMPORTANT: Use the path convention expected by the helper function is_avatar_path_owner(name)
  - Read the Ticket 36 migration/function and match its path logic exactly.
- After successful upload, store storage path in profiles.avatar_path
- Show preview immediately after selecting (use URL.createObjectURL), and after save show stored avatar.
- Replace behavior:
  - If user already has avatar_path, you may overwrite (upsert) or upload new and optionally delete old.
  - Must not delete someone else’s file (RLS will block anyway). Handle errors gracefully.

Headline
- Add headline field (short bio)
- Max length: 160 chars (hard limit in UI)
- Small hint text "160 chars max"
- Persist to profiles.headline

Skills tags
- Add add/remove tag input UI in Edit mode.
- Normalization rules:
  - trim whitespace
  - collapse multiple spaces to one
  - max tag length 24 chars
  - max tags count 12
  - avoid duplicates (case-insensitive duplicate check)
- Persist to profiles.skills (text[])
- Display in view mode as small pills/chips.

Edit/Save flow
- Keep single Edit / Save button (existing behavior).
- Save should update ALL fields (full_name, program, grad_year, role, plus new avatar_path/headline/skills).
- Do not break existing fields or post display.

Done when
- User can set avatar, headline, skills and it persists after refresh.
- Avatar respects RLS path ownership rules.
- No new dependencies.
- npm run build passes.
