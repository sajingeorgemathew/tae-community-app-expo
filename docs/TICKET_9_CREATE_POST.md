Ticket 9 — Create Post (member posting)
Route: /app/feed/new
Goal: Authenticated users can create a post and see it in the feed.

UI

Page title: “New Post”

Form fields:

content (textarea, required)

audience dropdown (all / students / alumni) default all

Buttons:

Submit (“Post”)

Cancel (link back to /app/feed)

Show error/success message (minimal)

Data rules

Get current auth session/user

Insert into public.posts with:

author_id = auth.uid()

content

audience

After successful insert:

redirect to /app/feed

post should appear (Option A instant publish)

Constraints

No editing posts yet

No attachments/images

No DB changes

Keep changes minimal and localized

Done

Any logged-in user can create a post

After posting, user lands on feed and sees it

npm run build passes

Provide local test steps