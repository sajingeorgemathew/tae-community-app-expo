Ticket 19 — Reactions v1 (per-user toggle, DB + UI)

Goal
Users can react to posts with a small emoji set. One user can react at most once per emoji per post (toggle on/off). Counts display on posts everywhere.

Emoji set (MVP)
❤️ 👍 😂

DB (Supabase)
Create table: public.post_reactions

Columns:

id uuid pk default gen_random_uuid()

post_id uuid fk -> public.posts(id) on delete cascade

user_id uuid fk -> public.profiles(id) on delete cascade

emoji text not null

created_at timestamptz default now()

Constraints:

Unique (post_id, user_id, emoji)

Check constraint: emoji in ('❤️','👍','😂')

RLS:

Enable RLS

SELECT: authenticated can read all reactions

INSERT: authenticated can insert only for themselves (user_id = auth.uid())

DELETE: user can delete own reaction OR admin can delete any

App

PostCard shows reactions bar with counts (❤️ 👍 😂)

Clicking emoji toggles:

If reacted already → delete row

Else → insert row

Counts displayed = aggregated counts from post_reactions for the posts currently shown

Pages impacted

Feed (/app/feed)

My profile (/app/me)

Member profile (/app/profile/[id])

Done when

User can toggle reactions on/off

Same emoji cannot be double-added by same user

Counts update without refresh (optimistic optional)

Build passes