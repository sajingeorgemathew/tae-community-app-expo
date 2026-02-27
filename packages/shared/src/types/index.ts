// Types barrel — re-export all entity types

export type {
  Profile,
  ProfileRole,
  ProfileUpdate,
  ProfileInsert,
  ProfileAdminUpdate,
} from "./profile";

export type {
  Post,
  PostInsert,
  PostAudience,
  PostAttachment,
  PostAttachmentInsert,
  PostReaction,
  PostComment,
  PostCommentInsert,
  PostWithAuthor,
} from "./posts";

export type {
  ConversationListItem,
  ConversationRead,
  ConversationDelivery,
  CreateConversation1to1Args,
  GetConversationReadStateArgs,
  ConversationReadState,
} from "./conversations";

export type {
  Message,
  MessageInsert,
  MessageAttachment,
  MessageAttachmentInsert,
  MessageWithAttachments,
} from "./messages";

export type { PresenceRow, PresenceUpsert } from "./presence";
export { PRESENCE_ONLINE_THRESHOLD_MS, PRESENCE_HEARTBEAT_INTERVAL_MS } from "./presence";

export type { StorageBucket, SignedUrlResult } from "./storage";
export {
  STORAGE_BUCKETS,
  SIGNED_URL_EXPIRY_SECONDS,
  avatarPath,
  postMediaPath,
  messageMediaPath,
} from "./storage";

export type {
  Question,
  QuestionInsert,
  QuestionWithAuthor,
  Answer,
  AnswerInsert,
  AnswerWithAuthor,
  QaActivityRead,
  GetQuestionsFeedArgs,
} from "./questions";

export type {
  Course,
  TutorCourseAssignment,
  TutorCourseAssignmentWithCourse,
} from "./courses";
