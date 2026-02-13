"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";

interface ProfileJoin {
  full_name: string | null;
  avatar_path: string | null;
}

interface QuestionDetail {
  id: string;
  title: string;
  body: string;
  author_id: string;
  created_at: string;
  author_name: string;
  author_avatar_url: string | null;
}

interface Answer {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  author_name: string;
  author_avatar_url: string | null;
}

interface AnswerRow {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  profiles: ProfileJoin | ProfileJoin[] | null;
}

export default function QuestionDetailPage() {
  const params = useParams();
  const questionId = params.id as string;

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const { resolveAvatarUrls } = useAvatarUrls();

  // Answer form
  const [answerBody, setAnswerBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchAnswers() {
    const { data, error: fetchError } = await supabase
      .from("answers")
      .select("id, body, author_id, created_at, profiles(full_name, avatar_path)")
      .eq("question_id", questionId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Error fetching answers:", fetchError.message);
      return;
    }

    const rows = (data ?? []) as AnswerRow[];

    const authorAvatars: { id: string; avatar_path: string | null }[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (!seen.has(row.author_id)) {
        seen.add(row.author_id);
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        authorAvatars.push({ id: row.author_id, avatar_path: profile?.avatar_path ?? null });
      }
    }
    const avatarUrlMap = await resolveAvatarUrls(authorAvatars);

    setAnswers(
      rows.map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          body: row.body,
          author_id: row.author_id,
          created_at: row.created_at,
          author_name: profile?.full_name ?? "Unknown",
          author_avatar_url: avatarUrlMap[row.author_id] ?? null,
        };
      })
    );
  }

  useEffect(() => {
    async function init() {
      // Get session + role
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (profile) {
          setCurrentUserRole(profile.role);
        }
      }

      // Fetch question
      const { data: qData, error: qError } = await supabase
        .from("questions")
        .select("id, title, body, author_id, created_at, profiles(full_name, avatar_path)")
        .eq("id", questionId)
        .single();

      if (qError || !qData) {
        if (qError?.code === "PGRST116") {
          setNotFound(true);
        } else {
          console.error("Error fetching question:", qError?.message);
          setError("Failed to load question.");
        }
        setLoading(false);
        return;
      }

      const row = qData as unknown as {
        id: string;
        title: string;
        body: string;
        author_id: string;
        created_at: string;
        profiles: ProfileJoin | ProfileJoin[] | null;
      };

      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const avatarUrlMap = await resolveAvatarUrls([
        { id: row.author_id, avatar_path: profile?.avatar_path ?? null },
      ]);

      setQuestion({
        id: row.id,
        title: row.title,
        body: row.body,
        author_id: row.author_id,
        created_at: row.created_at,
        author_name: profile?.full_name ?? "Unknown",
        author_avatar_url: avatarUrlMap[row.author_id] ?? null,
      });

      await fetchAnswers();
      setLoading(false);
    }

    init();
  }, [questionId]);

  async function handleSubmitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId || !answerBody.trim()) return;

    setSubmitting(true);
    const { error: insertError } = await supabase
      .from("answers")
      .insert({ question_id: questionId, body: answerBody.trim(), author_id: currentUserId });

    if (insertError) {
      console.error("Error posting answer:", insertError.message);
      alert("Failed to post answer.");
      setSubmitting(false);
      return;
    }

    setAnswerBody("");
    setSubmitting(false);
    await fetchAnswers();
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const canAnswer = currentUserRole === "admin" || currentUserRole === "tutor";

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen p-8">
        <div className="mb-6">
          <Link href="/app/questions" className="text-blue-600 hover:underline text-sm">
            &larr; Back to Questions
          </Link>
        </div>
        <p className="text-gray-500">Question not found.</p>
      </main>
    );
  }

  if (error || !question) {
    return (
      <main className="min-h-screen p-8">
        <div className="mb-6">
          <Link href="/app/questions" className="text-blue-600 hover:underline text-sm">
            &larr; Back to Questions
          </Link>
        </div>
        <p className="text-red-600">{error ?? "Something went wrong."}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mb-6">
        <Link href="/app/questions" className="text-blue-600 hover:underline text-sm">
          &larr; Back to Questions
        </Link>
      </div>

      {/* Question */}
      <div className="border rounded p-6 mb-8">
        <h1 className="text-2xl font-semibold mb-3">{question.title}</h1>
        <div className="flex items-center gap-3 mb-4">
          <Avatar
            fullName={question.author_name}
            avatarUrl={question.author_avatar_url}
            size="sm"
          />
          <span className="text-sm text-gray-600">
            {question.author_name} · {formatDate(question.created_at)}
          </span>
        </div>
        <p className="text-gray-800 whitespace-pre-wrap">{question.body}</p>
      </div>

      {/* Answers */}
      <h2 className="text-lg font-semibold mb-4">
        Answers ({answers.length})
      </h2>

      {answers.length === 0 ? (
        <p className="text-gray-500 mb-6">No answers yet.</p>
      ) : (
        <ul className="space-y-4 mb-6">
          {answers.map((a) => (
            <li key={a.id} className="border rounded p-4">
              <div className="flex items-center gap-3 mb-2">
                <Avatar
                  fullName={a.author_name}
                  avatarUrl={a.author_avatar_url}
                  size="sm"
                />
                <span className="text-sm text-gray-600">
                  {a.author_name} · {formatDate(a.created_at)}
                </span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{a.body}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Answer form — tutor/admin only */}
      {canAnswer && (
        <form onSubmit={handleSubmitAnswer} className="border rounded p-4 space-y-3">
          <label className="block text-sm font-medium">Your Answer</label>
          <textarea
            value={answerBody}
            onChange={(e) => setAnswerBody(e.target.value)}
            required
            rows={4}
            className="w-full border rounded px-3 py-2"
            placeholder="Write your answer..."
          />
          <button
            type="submit"
            disabled={submitting || !answerBody.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post Answer"}
          </button>
        </form>
      )}
    </main>
  );
}
