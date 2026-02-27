# EXPO-02 — Shared TypeScript types + Supabase contract helpers (@tae/shared)

## Goal
Create a shared contract layer in `packages/shared/` with:
- Shared TypeScript entity types (Profile, Post, Conversation, Message, Attachments, Presence, etc.)
- A small helper layer for Supabase clients (browser/mobile/server callers can import consistently later)
- Lightweight runtime guards/validators for key payloads (best-effort, minimal)

This is used by the Expo app to avoid re-learning backend logic page-by-page.

## Inputs
- docs/contracts/supabase-contract.md (EXPO-01)

## Non-goals
- No schema migrations
- No changes to apps/web behavior
- Do not add heavy frameworks or codegen
- No Expo app creation yet (that’s MOBILE-01)

## Deliverables (packages/shared)
- `packages/shared/src/types/`:
  - profile.ts
  - posts.ts
  - conversations.ts
  - messages.ts
  - storage.ts
  - presence.ts
  - index.ts barrel exports
- `packages/shared/src/supabase/`:
  - client.ts (createClient helper, no secrets)
  - queries/ (optional, only if helpful)
- `packages/shared/src/validators/`:
  - minimal validators for frequently used shapes (optional; keep tiny)
- Update `packages/shared/package.json` if needed for exports/typings.

## Acceptance criteria
- Types match EXPO-01 contract doc (tables/columns used)
- No changes to apps/web code
- `packages/shared` can be imported (TS compiles)
- Repo builds remain healthy:
  - npm run web:typecheck
  - npm run web:build

## Test plan
- Run web:typecheck and web:build from repo root
- Ensure no TS errors from shared package

---

## Implementation Log

### Files created

| File | Purpose |
|------|---------|
| `packages/shared/src/types/profile.ts` | Profile, ProfileRole, ProfileUpdate, ProfileInsert, ProfileAdminUpdate |
| `packages/shared/src/types/posts.ts` | Post, PostInsert, PostAttachment, PostReaction, PostComment, PostWithAuthor |
| `packages/shared/src/types/conversations.ts` | ConversationListItem (RPC shape), ConversationRead, ConversationDelivery, RPC arg/return types |
| `packages/shared/src/types/messages.ts` | Message, MessageInsert, MessageAttachment, MessageWithAttachments |
| `packages/shared/src/types/presence.ts` | PresenceRow, PresenceUpsert, threshold/interval constants |
| `packages/shared/src/types/storage.ts` | StorageBucket union, STORAGE_BUCKETS const, path helper functions |
| `packages/shared/src/types/questions.ts` | Question, Answer, QaActivityRead, joined author variants, RPC args |
| `packages/shared/src/types/courses.ts` | Course, TutorCourseAssignment, TutorCourseAssignmentWithCourse |
| `packages/shared/src/types/index.ts` | Barrel re-exports for all type modules |
| `packages/shared/src/supabase/client.ts` | `createSupabaseClient({ url, anonKey })` — platform-agnostic factory |
| `packages/shared/src/validators/index.ts` | `requireString`, `requireUUID`, `validateMessageInsert`, `validatePostInsert` |
| `packages/shared/src/index.ts` | Top-level barrel: types + supabase helper + validators |
| `packages/shared/tsconfig.json` | TypeScript config for shared package (strict, noEmit, bundler resolution) |
| `packages/shared/package.json` | Updated: version 0.1.0, typecheck script, `@supabase/supabase-js` dep |

### Mapping to EXPO-01 contract

| Contract table / feature | Shared type(s) |
|--------------------------|----------------|
| `profiles` (14 columns) | `Profile`, `ProfileRole`, `ProfileUpdate`, `ProfileInsert`, `ProfileAdminUpdate` |
| `posts` (5 columns) | `Post`, `PostInsert`, `PostWithAuthor` |
| `post_attachments` (5 columns) | `PostAttachment`, `PostAttachmentInsert` |
| `post_reactions` (3 columns) | `PostReaction` |
| `post_comments` (6 columns + join) | `PostComment`, `PostCommentInsert` |
| `messages` (6 columns) | `Message`, `MessageInsert`, `MessageWithAttachments` |
| `message_attachments` (6 columns) | `MessageAttachment`, `MessageAttachmentInsert` |
| `conversation_reads` (3 columns) | `ConversationRead` |
| `conversation_deliveries` (3 columns) | `ConversationDelivery` |
| `presence` (2 columns) | `PresenceRow`, `PresenceUpsert` + constants |
| `questions` (5 columns) | `Question`, `QuestionInsert`, `QuestionWithAuthor` |
| `answers` (5 columns) | `Answer`, `AnswerInsert`, `AnswerWithAuthor` |
| `qa_activity_reads` (2 columns) | `QaActivityRead` |
| `courses` (4 columns) | `Course` |
| `tutor_course_assignments` (2 columns) | `TutorCourseAssignment`, `TutorCourseAssignmentWithCourse` |
| RPC `get_my_conversations` | `ConversationListItem` |
| RPC `create_conversation_1to1` | `CreateConversation1to1Args` |
| RPC `get_conversation_read_state` | `GetConversationReadStateArgs`, `ConversationReadState` |
| RPC `get_questions_feed` | `GetQuestionsFeedArgs` |
| Storage buckets (3) | `StorageBucket`, `STORAGE_BUCKETS`, path helpers |

### Verification results
- `npx -w @tae/shared tsc --noEmit` — pass (no errors)
- `npm run web:typecheck` — pass
- `npm run web:build` — pass
- No changes to `apps/web/` code

### Assumptions / Open questions
1. **PostAudience**: Defined as `string` (not a literal union) because the contract doc doesn't enumerate audience values. Can be tightened once we know the full set.
2. **No `conversations` table type**: The web app accesses conversations only through the `get_my_conversations` RPC, so we model the RPC return shape (`ConversationListItem`) rather than a raw table row.
3. **`@supabase/supabase-js` as dependency**: Added to shared package to provide the `createSupabaseClient` helper. Version pinned to match web (`^2.90.1`).
4. **No build step**: Types are consumed as raw `.ts` via workspace resolution. No compilation needed for now; both Next.js and Expo's bundlers handle TS natively.