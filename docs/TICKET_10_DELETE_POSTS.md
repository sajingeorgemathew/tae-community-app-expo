Ticket 10 — Delete posts (author + admin)

Goal
Add minimal moderation controls so posts can be deleted safely.

UI rules

Show “Delete” button on a post if:

current user is the post author

OR current user has role admin

Button should not appear otherwise

Behavior

Clicking Delete:

asks for confirmation (simple confirm() is fine)

deletes the post via Supabase

removes it from the feed UI immediately

No edit functionality yet

Data rules

Use existing posts table

Rely on RLS:

author can delete own posts

admin can delete any post

Constraints

No DB or RLS changes

No admin dashboard yet

Keep changes minimal

Modify feed page only (and helpers if needed)

Done

Author can delete own post

Admin can delete any post

Other users cannot see delete button

npm run build passes