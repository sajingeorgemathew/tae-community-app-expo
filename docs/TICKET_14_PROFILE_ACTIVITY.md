Ticket 14 — Profile activity (posts by author)

Goal: Show member posts on profile pages using same UI as feed (including media).

Routes to update

/app/profile/[id]

Add section: “Posts by this member”

Show newest posts authored by [id] (limit 30)

/app/me

Add section: “My Posts”

Show newest posts authored by current user auth.uid() (limit 30)

Post card requirements

Reuse the same rendering pattern as /app/feed:

content + created date + audience badge

attachments rendered under post:

image → <img>

video → <video controls>

link → <a target="_blank">

Use signed URLs (bucket is private):

post-media

expiry: 3600 seconds

Data rules

Fetch posts filtered by author_id

Then fetch attachments from post_attachments for those post IDs

Generate signed URLs for image/video using storage_path

Graceful empty state:

“No posts yet.”

Done when

Clicking a member profile shows their posts + media

/app/me shows current user posts + media

Refresh works

npm run build passes