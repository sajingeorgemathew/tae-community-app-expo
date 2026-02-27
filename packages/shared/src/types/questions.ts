// Question & Answer types — based on EXPO-01 supabase-contract.md

/** Question row */
export interface Question {
  id: string;
  title: string;
  body: string;
  author_id: string;
  created_at: string;
}

/** Payload for inserting a new question */
export interface QuestionInsert {
  title: string;
  body: string;
  author_id: string;
}

/** Question with joined author profile */
export interface QuestionWithAuthor extends Question {
  profiles: {
    full_name: string | null;
    avatar_path: string | null;
  };
}

/** Answer row */
export interface Answer {
  id: string;
  question_id: string;
  body: string;
  author_id: string;
  created_at: string;
}

/** Payload for inserting a new answer */
export interface AnswerInsert {
  question_id: string;
  body: string;
  author_id: string;
}

/** Answer with joined author profile */
export interface AnswerWithAuthor extends Answer {
  profiles: {
    full_name: string | null;
    avatar_path: string | null;
  };
}

/** Q&A activity read tracking */
export interface QaActivityRead {
  user_id: string;
  last_seen_at: string;
}

/** Args for get_questions_feed RPC */
export interface GetQuestionsFeedArgs {
  limit_count: number;
}
