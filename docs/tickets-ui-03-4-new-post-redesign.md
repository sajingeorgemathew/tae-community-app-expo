# UI-03.4 New Post Page Redesign

## Goal
Redesign the New Post experience to match the premium white/navy theme.

## Routes
- /app/feed/new (primary)
- If /app/feed?new=1 still exists, do not change routing logic here.

## Critical Rule
Preserve:
- Post creation logic
- Audience selection logic
- Media upload logic (Supabase storage)
- Attachment preview/delete logic
- Validation and error handling

UI/layout changes only.

## Design Requirements
Use docs/newpost.png as inspiration only.

Layout:
- Page header: "Create Post" + subtitle
- Composer as a large card:
  - Content textarea (comfortable spacing)
  - Audience selector (if present)
  - Attachment area (dropzone-style or clean button row)
  - Attachment previews as thumbnails/cards
- Sticky action row (optional):
  - Cancel/back link
  - Post button (primary navy)
- Loading state on Post button
- Clear inline error message style

## Acceptance
- Can create a text-only post
- Can create post with images/video (if supported)
- Attachments still upload and show previews
- No console errors
- No DB/migration changes

## Implementation Notes

### Files changed
- `src/app/app/feed/new/page.tsx` — UI-only rewrite of the return JSX

### What changed (UI only)
- **Header**: "Create New Post" with subtitle, navy back-arrow link
- **Composer card**: Single white card (`rounded-xl border shadow-sm`) containing all sections
- **Textarea**: Larger (6 rows), slate-50 background, navy focus ring, "Markdown supported" hint
- **Audience selector**: Replaced `<select>` with pill buttons (navy active, slate inactive). Same state variable and values.
- **Link input**: Added chain-link icon prefix, same validation logic
- **Attachments**: Dropzone-style buttons (dashed border, icon, subtitle) replacing raw file inputs. Hidden `<input>` triggered by button click.
- **Attachment previews**: Grid cards with file icon, name, size. Red circle X button on hover to remove.
- **Action row**: Right-aligned Cancel (outlined) + Post Update (navy, spinner when submitting)
- **Error banner**: Red-50 background with exclamation icon
- **Loading state**: Spinner animation instead of plain "Loading..."
- **Footer**: "By posting, you agree to the Community Guidelines" note

### What was NOT changed
- All state variables, handlers, refs unchanged
- File validation constants unchanged
- `handleSubmit`, `handleImageChange`, `handleVideoChange`, `removeImage`, `removeVideo` unchanged
- Supabase upload logic unchanged (bucket: `post-media`, path: `posts/{postId}/{uuid}.{ext}`)
- Auth check and redirect unchanged
- Navigation after post: `router.push("/app/feed")` unchanged
- No new components extracted (all inline in page)

## Testing Steps

### Manual Testing
1. **Navigate to /app/feed/new** — page loads with styled card layout
2. **Text-only post**: Type content, select audience, click "Post Update" → redirects to feed, post appears
3. **Post with images**: Click "Upload images" dropzone, select 1-3 images → preview cards appear with names/sizes → post → images appear in feed
4. **Post with video**: Click "Upload video" dropzone, select an MP4 → preview card appears → post → video linked in feed
5. **Post with link**: Enter a URL in the link field → post → link attachment saved
6. **Remove attachments**: Add images, hover over preview card, click red X → file removed from list
7. **Audience pills**: Click each pill (All Members / Students / Alumni) → pill highlights navy, others reset
8. **Validation errors**: Submit with empty content → error banner shows. Upload oversized file → error banner shows.
9. **Submitting state**: Click post → button shows spinner + "Posting...", button disabled
10. **Cancel**: Click Cancel → navigates back to /app/feed
11. **Back arrow**: Click "Back to Feed" → navigates back to /app/feed
12. **No console errors**: Check browser console throughout all actions
