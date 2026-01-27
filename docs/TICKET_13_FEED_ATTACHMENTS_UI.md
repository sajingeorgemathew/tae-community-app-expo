Ticket 13 — Feed renders attachments (images/video/link)

Route: /app/feed

Goal: Logged-in users can see post attachments.

Attachments source: public.post_attachments

image/video: storage_path (bucket: post-media)

link: url

Implementation rules

Keep changes minimal.

Prefer signed URLs for image/video because bucket is private.

Signed URL expiry: ~3600 seconds.

Do not change DB or storage policies.

UI

Under each post:

images: show thumbnails using <img>

video: render <video controls>

link: render clickable <a> (open in new tab)

Done when

Image/video/link attachments show up under posts

Refresh works (signed URLs regenerate)

npm run build passes

Local test steps included