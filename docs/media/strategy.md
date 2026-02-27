# Media Strategy — TAE Community App

> Ticket: EXPO-03 | Created: 2026-02-26

This document defines the authoritative media strategy for all Supabase Storage usage across the web and Expo mobile apps.

---

## Buckets Overview

| Bucket | Visibility | Purpose | Path prefix |
|--------|-----------|---------|-------------|
| `profile-avatars` | Private | User profile photos | `avatars/` |
| `post-media` | Private | Feed post images & videos | `posts/` |
| `message-media` | Private | Chat message attachments | `messages/` |

All three buckets are **private** — reads require signed URLs.

---

## Bucket-by-Bucket Strategy

### 1. `profile-avatars`

**Path format:**
```
avatars/{userId}/avatar.{ext}
```

**Examples:**
```
avatars/d4e5f6a7-1234-5678-9abc-def012345678/avatar.jpg
avatars/d4e5f6a7-1234-5678-9abc-def012345678/avatar.png
```

**Behaviour:**
- Upload with `upsert: true` — replaces existing avatar on change.
- One avatar per user at a time.
- Old avatar path is deleted before uploading new one (if extension changes).
- RLS policy `is_avatar_path_owner(name)` verifies the path starts with `avatars/{auth.uid()}/`.

**URL strategy:** Signed URL, 1-hour TTL.

---

### 2. `post-media`

**Path format:**
```
posts/{postId}/{fileId}.{ext}
```

**Examples:**
```
posts/a1b2c3d4-5678-90ab-cdef-1234567890ab/f7e8d9c0-1234-5678-9abc-def012345678.jpg
posts/a1b2c3d4-5678-90ab-cdef-1234567890ab/b2c3d4e5-6789-01ab-cdef-2345678901bc.mp4
```

**Behaviour:**
- Upload with `upsert: false` — each attachment gets a unique UUID filename.
- Multiple attachments per post are supported.
- Paths stored in `post_attachments.storage_path`.
- On post deletion, all attachment paths under `posts/{postId}/` are removed.
- Upload options include `contentType` from the original file.

**URL strategy:** Signed URLs via `createSignedUrls` (batch), 1-hour TTL.

---

### 3. `message-media`

**Path format:**
```
messages/{conversationId}/{messageId}/{fileId}.{ext}
```

**Examples:**
```
messages/c0d1e2f3-4567-89ab-cdef-0123456789ab/m1n2o3p4-5678-90ab-cdef-1234567890ab/a1b2c3d4.png
```

**Behaviour:**
- Upload with default `upsert: false`.
- One attachment per message (current UX).
- Paths stored in `message_attachments.storage_path`.
- RLS policy `extract_conversation_id_from_path(name)` splits the path on `/` and reads segment index 1 to verify conversation membership.

**URL strategy:** Signed URL per attachment, 1-hour TTL.

---

## URL Strategy

### Signed URLs (all buckets)

All buckets are private. Every read goes through `createSignedUrl` or `createSignedUrls`.

| Setting | Value | Rationale |
|---------|-------|-----------|
| Default TTL | 3600 s (1 hour) | Matches web app; long enough for a session |
| Batch signing | Yes, via `createSignedUrls` | Reduces HTTP round-trips for feeds |

**Helpers** (in `@tae/shared`):
- `createSignedUrl(supabase, bucket, path, expiresIn?)` — single URL
- `createSignedUrlsBatch(supabase, bucket, paths[], expiresIn?)` — batch

### Public URLs

Currently no buckets are public. If `post-media` is ever made public, use:
- `getPublicUrl(supabase, bucket, path)` — returns a permanent, unsigned URL

---

## Caching Recommendations

### Web (current)

- In-memory `Map` (via `useRef`) per page session.
- Cleared on navigation / page reload.
- Sufficient because browser handles HTTP caching of signed URL responses.

### Mobile (Expo — future)

| Strategy | Tool | Details |
|----------|------|---------|
| **URL cache** | MMKV or AsyncStorage | Store `{ signedUrl, expiresAt }` keyed by storage path. Refresh when `Date.now() > expiresAt - 300_000` (5-min buffer). |
| **Image cache** | `expo-image` (built-in disk cache) | `expo-image` caches decoded images to disk automatically. Use the signed URL as the cache key. |
| **Prefetch** | On feed/conversation load | Batch-sign all visible media paths, store results in URL cache. |
| **Invalidation** | On upload / avatar change | Clear the cached URL for the affected path so the next render fetches a fresh signed URL. |

**Recommended TTL for mobile URL cache:** 3600 s (match the signed URL expiry). Refresh 5 minutes before expiry to avoid flicker.

---

## Deletion Rules

| Bucket | Who can delete | Trigger | Cleanup steps |
|--------|---------------|---------|---------------|
| `profile-avatars` | Path owner | Avatar change or profile deletion | Delete old path before uploading new one |
| `post-media` | Uploader or admin | Post deletion | Fetch `post_attachments` for the post, delete each `storage_path` from bucket, then delete DB rows |
| `message-media` | Message sender | Message deletion | Fetch `message_attachments` for the message, delete each `storage_path` from bucket, then delete DB row |

**App responsibility:** Always delete storage objects **before** (or alongside) deleting the DB row that references them. Otherwise orphaned files remain in the bucket.

---

## Upload Semantics

### Content-Type

Always pass `contentType` when uploading. Extract from:
- **Web:** `file.type` (from the `File` object)
- **Expo:** MIME type from `expo-image-picker` result or infer from extension via a lookup table

### Extension Normalization

Use `normalizeExtension(raw)` from `@tae/shared`:
- Strips leading dots
- Lowercases
- Falls back to `"bin"` if empty

### Max File Size (recommendations)

| Type | Recommended max | Notes |
|------|----------------|-------|
| Avatar | 5 MB | Suggest client-side resize to 512x512 before upload |
| Post image | 10 MB | Consider client-side compression |
| Post video | 50 MB | Consider streaming upload for large files |
| Message attachment | 10 MB | Match post image limit |

These are application-level suggestions; Supabase bucket-level limits should also be configured.

---

## Expo Implementation Notes

> These are NOT implemented in EXPO-03. This section guides the future mobile ticket.

### Picking files

```
expo-image-picker → ImagePickerResult { uri, type, fileName, ... }
expo-document-picker → DocumentPickerResult { uri, mimeType, name, size }
```

### Converting to uploadable body

Supabase JS `upload()` accepts `Blob | ArrayBuffer | File`. On Expo:

1. Read the file URI with `expo-file-system`:
   ```ts
   import * as FileSystem from 'expo-file-system';
   const base64 = await FileSystem.readAsStringAsync(uri, {
     encoding: FileSystem.EncodingType.Base64,
   });
   ```
2. Convert base64 to `ArrayBuffer` (use a decode utility or `Buffer.from` with a polyfill).
3. Pass the `ArrayBuffer` as `body` in the `UploadSource` interface.

Alternatively, use `fetch(uri)` then `.blob()` — this is simpler and often works on React Native:
```ts
const response = await fetch(uri);
const blob = await response.blob();
```

### Upload content-type

Always set `contentType` explicitly. Do not rely on auto-detection — Supabase may default to `application/octet-stream` if not provided.

### Shared upload interface

Use `uploadFile(supabase, source)` from `@tae/shared`. The `UploadSource` interface accepts `Blob | ArrayBuffer` for the body, making it compatible with both web and Expo.

---

## Shared Helpers Reference

All helpers are exported from `@tae/shared`:

### Path builders
| Function | Signature | Output example |
|----------|-----------|----------------|
| `buildAvatarPath` | `({ userId, ext })` | `avatars/{userId}/avatar.jpg` |
| `buildPostMediaPath` | `({ postId, ext, fileId? })` | `posts/{postId}/{uuid}.png` |
| `buildMessageMediaPath` | `({ conversationId, messageId, ext, fileId? })` | `messages/{convId}/{msgId}/{uuid}.pdf` |

### Extension helpers
| Function | Purpose |
|----------|---------|
| `normalizeExtension(raw)` | Lowercase, strip dot, fallback to `"bin"` |
| `extractExtension(filename)` | Get extension from filename |
| `isAllowedExtension(ext)` | Check against allowed set |
| `isImageExtension(ext)` | Check if image type |
| `isVideoExtension(ext)` | Check if video type |

### URL helpers
| Function | Purpose |
|----------|---------|
| `getPublicUrl(supabase, bucket, path)` | Unsigned public URL |
| `createSignedUrl(supabase, bucket, path, expiresIn?)` | Single signed URL |
| `createSignedUrlsBatch(supabase, bucket, paths[], expiresIn?)` | Batch signed URLs |

### Upload helpers
| Function | Purpose |
|----------|---------|
| `uploadFile(supabase, source)` | Upload a file (platform-agnostic) |
| `removeFile(supabase, bucket, paths[])` | Delete files from storage |
