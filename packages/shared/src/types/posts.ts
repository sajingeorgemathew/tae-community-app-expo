// Post types — based on EXPO-01 supabase-contract.md

/** Audience enum for posts */
export type PostAudience = string; // open-ended; extend as needed

/** Post row as returned by select queries */
export interface Post {
  id: string;
  author_id: string;
  content: string;
  audience: PostAudience | null;
  created_at: string;
}

/** Payload for inserting a new post */
export interface PostInsert {
  author_id: string;
  content: string;
  audience?: PostAudience;
}

/** Post attachment row */
export interface PostAttachment {
  id: string;
  post_id: string;
  type: string;
  storage_path: string;
  url: string | null;
}

/** Payload for inserting a post attachment */
export interface PostAttachmentInsert {
  post_id: string;
  type: string;
  storage_path: string;
  url?: string;
}

/** Post reaction row */
export interface PostReaction {
  post_id: string;
  user_id: string;
  emoji: string;
}

/** Post comment row */
export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string | null;
}

/** Payload for inserting a post comment */
export interface PostCommentInsert {
  post_id: string;
  author_id: string;
  content: string;
}

/** Post with joined author profile (common query shape) */
export interface PostWithAuthor extends Post {
  profiles: {
    full_name: string | null;
    avatar_path: string | null;
  };
}
