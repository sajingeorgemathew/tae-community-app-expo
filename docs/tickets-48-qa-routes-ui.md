# Ticket 48 — Q&A Routes (Standalone Pages)

## Goal
Add standalone Q&A pages:
- /app/questions (list + create question)
- /app/questions/[id] (detail + answers + answer form for tutor/admin)

## Routes
- src/app/app/questions/page.tsx
- src/app/app/questions/[id]/page.tsx

## Features
### /app/questions
- List recent questions (newest first)
- Show title, author name, created_at, short body preview
- Button: "Ask a Question" (modal or inline form)
- Insert uses RLS: author_id must be auth.uid()

### /app/questions/[id]
- Show question title/body/author/date
- Show answers list (oldest first or newest first)
- Answer form visible only if current user role in ('admin','tutor')
- Insert answer uses RLS: author_id must be auth.uid()

## Non-goals
- No faculty embedding yet
- No course filtering yet (optional display only)
- No voting/accepted answers/notifications
- No realtime, polling is fine

## Manual Supabase steps
None (assumes Ticket 47 is applied).

## Implementation notes
- questions/page.tsx: inline toggle form, fetches 30 newest questions with profile join + avatars
- questions/[id]/page.tsx: fetches question + answers (asc), checks user role, shows answer form for tutor/admin only
- "Questions" link added to left nav in app/page.tsx (after Faculty)
- No new shared components; uses existing Avatar, supabaseClient, useAvatarUrls

## Testing checklist
- [ ] Navigate to /app → "Questions" link visible in left nav
- [ ] /app/questions loads, shows list of questions (or empty state)
- [ ] Click "Ask a Question" → form appears; fill title + body → submit → question appears in list
- [ ] Click a question → /app/questions/[id] loads with full question detail
- [ ] As a member (role=member): no answer form visible on detail page
- [ ] As a tutor or admin: answer form visible; submit answer → answer appears in list
- [ ] Answers show "No answers yet." when none exist
- [ ] Invalid question ID → "Question not found." message
- [ ] Author avatars display correctly on list and detail pages
