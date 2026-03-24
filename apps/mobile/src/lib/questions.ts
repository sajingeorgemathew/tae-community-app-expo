import type { ProfileRole } from "@tae/shared";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Questions feed (list)
// ---------------------------------------------------------------------------

/** Shape returned by the get_questions_feed RPC */
export interface QuestionFeedRow {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string | null;
  author_avatar_path: string | null;
  answer_count: number;
  latest_answer_at: string | null;
  latest_replier_id: string | null;
  latest_replier_name: string | null;
  latest_replier_avatar_path: string | null;
  latest_replier_role: string | null;
}

const FEED_LIMIT = 30;

export async function fetchQuestionsFeed(): Promise<QuestionFeedRow[]> {
  const { data, error } = await supabase.rpc("get_questions_feed", {
    limit_count: FEED_LIMIT,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as QuestionFeedRow[];
}

// ---------------------------------------------------------------------------
// Question detail
// ---------------------------------------------------------------------------

interface ProfileJoin {
  full_name: string | null;
  avatar_path: string | null;
  role: string | null;
}

interface QuestionRow {
  id: string;
  title: string;
  body: string;
  author_id: string;
  created_at: string;
  author: ProfileJoin | ProfileJoin[] | null;
}

export interface QuestionDetail {
  id: string;
  title: string;
  body: string;
  author_id: string;
  created_at: string;
  author_name: string;
  author_avatar_path: string | null;
}

export async function fetchQuestionById(
  questionId: string,
): Promise<QuestionDetail> {
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, title, body, author_id, created_at, author:profiles!questions_author_id_fkey(full_name, avatar_path, role)",
    )
    .eq("id", questionId)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Question not found");

  const row = data as unknown as QuestionRow;
  const profile = Array.isArray(row.author) ? row.author[0] : row.author;

  return {
    id: row.id,
    title: row.title,
    body: row.body,
    author_id: row.author_id,
    created_at: row.created_at,
    author_name: profile?.full_name ?? "Unknown",
    author_avatar_path: profile?.avatar_path ?? null,
  };
}

// ---------------------------------------------------------------------------
// Answers for a question
// ---------------------------------------------------------------------------

interface AnswerRow {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  author: ProfileJoin | ProfileJoin[] | null;
}

export interface AnswerDetail {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  author_name: string;
  author_avatar_path: string | null;
  author_role: string | null;
}

export async function fetchAnswersForQuestion(
  questionId: string,
): Promise<AnswerDetail[]> {
  const { data, error } = await supabase
    .from("answers")
    .select(
      "id, body, author_id, created_at, author:profiles!answers_author_id_fkey(full_name, avatar_path, role)",
    )
    .eq("question_id", questionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as AnswerRow[]).map((row) => {
    const profile = Array.isArray(row.author) ? row.author[0] : row.author;
    return {
      id: row.id,
      body: row.body,
      author_id: row.author_id,
      created_at: row.created_at,
      author_name: profile?.full_name ?? "Unknown",
      author_avatar_path: profile?.avatar_path ?? null,
      author_role: profile?.role ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Create an answer
// ---------------------------------------------------------------------------

export async function createAnswer(
  questionId: string,
  authorId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from("answers")
    .insert({ question_id: questionId, body, author_id: authorId });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Create a question
// ---------------------------------------------------------------------------

export async function createQuestion(
  authorId: string,
  title: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .insert({ title, body, author_id: authorId });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Update / Delete helpers
// ---------------------------------------------------------------------------

/**
 * Update an owned question (RLS: author_id = auth.uid()).
 */
export async function updateQuestion(
  questionId: string,
  title: string,
  body: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("questions")
    .update({ title: title.trim(), body: body.trim(), updated_at: now })
    .eq("id", questionId);
  if (error) throw new Error(error.message);
}

/**
 * Delete a question.
 * RLS allows owner (author_id = auth.uid()) OR admin to delete.
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);
  if (error) throw new Error(error.message);
}

/**
 * Update an owned answer (RLS: author_id = auth.uid()).
 */
export async function updateAnswer(
  answerId: string,
  body: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("answers")
    .update({ body: body.trim(), updated_at: now })
    .eq("id", answerId);
  if (error) throw new Error(error.message);
}

/**
 * Delete an answer.
 * RLS allows owner (author_id = auth.uid()) OR admin to delete.
 */
export async function deleteAnswer(answerId: string): Promise<void> {
  const { error } = await supabase
    .from("answers")
    .delete()
    .eq("id", answerId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

/** Roles that are allowed to submit answers. */
const ANSWER_ROLES: ReadonlySet<ProfileRole> = new Set<ProfileRole>([
  "tutor",
  "admin",
]);

export function canSubmitAnswer(role: ProfileRole | null | undefined): boolean {
  return !!role && ANSWER_ROLES.has(role);
}
