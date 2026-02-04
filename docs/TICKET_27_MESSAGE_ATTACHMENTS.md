Ticket 27 — Messaging attachments v1 (upload + display + size limits)
Goal

Allow 1:1 messages to include image/video attachments stored in Supabase Storage bucket message-media, securely locked by conversation membership.

Constraints

Images: max 5MB

Videos: max 35MB

Accept: images (jpeg/png/webp/gif optional), videos (mp4/webm)

A message may be attachments-only (content nullable already)

Use existing Ticket 24 path convention:
messages/{conversation_id}/{message_id}/{uuid}.{ext}

DB / Storage

Use existing tables:

messages

message_attachments (type, storage_path, mime_type, size_bytes)

Use existing bucket: message-media (private)

Use signed URLs for display:

supabase.storage.from('message-media').createSignedUrl(path, 3600)

App Scope (UI)

Update: src/app/app/messages/page.tsx

Add attachment picker in composer (next to input):

allow selecting one file per message for MVP

show selected file name + size + clear button

On send:

insert message row first (content can be null if attachment-only)

upload file to storage at path convention above

insert message_attachments row for that message

Render attachments in thread:

image -> thumbnail with max width constraint

video -> <video controls> with max width + max height

Must not allow upload if file exceeds size limit; show a simple error message.

Security requirements

Do NOT loosen RLS.

Upload must succeed only if user is a conversation member (storage policy already enforces).

Only members can read attachments (RLS/storage policies already enforce).

Done when

User can send an image (<=5MB) and it displays

User can send a video (<=35MB) and it displays

Over-limit uploads are blocked client-side with clear message

Refresh loads attachments via signed URLs

npm run build passes