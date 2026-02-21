"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";

const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

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
  author: ProfileJoin | ProfileJoin[] | null;
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
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());

  // Answer form
  const [answerBody, setAnswerBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchAnswers() {
    const { data, error: fetchError } = await supabase
      .from("answers")
      .select("id, body, author_id, created_at, author:profiles!answers_author_id_fkey(full_name, avatar_path)")
      .eq("question_id", questionId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Error fetching answers:", fetchError.message, fetchError.details);
      return;
    }

    const rows = (data ?? []) as AnswerRow[];

    const authorAvatars: { id: string; avatar_path: string | null }[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (!seen.has(row.author_id)) {
        seen.add(row.author_id);
        const profile = Array.isArray(row.author) ? row.author[0] : row.author;
        authorAvatars.push({ id: row.author_id, avatar_path: profile?.avatar_path ?? null });
      }
    }
    const avatarUrlMap = await resolveAvatarUrls(authorAvatars);

    setAnswers(
      rows.map((row) => {
        const profile = Array.isArray(row.author) ? row.author[0] : row.author;
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
        .select("id, title, body, author_id, created_at, author:profiles!questions_author_id_fkey(full_name, avatar_path)")
        .eq("id", questionId)
        .single();

      if (qError || !qData) {
        if (qError?.code === "PGRST116") {
          setNotFound(true);
        } else {
          console.error("Error fetching question:", qError?.message, qError?.details);
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
        author: ProfileJoin | ProfileJoin[] | null;
      };

      const profile = Array.isArray(row.author) ? row.author[0] : row.author;
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

  // Ticket 53: fetch presence for question + answer authors
  useEffect(() => {
    if (!question) return;
    const ids = new Set<string>([question.author_id]);
    for (const a of answers) ids.add(a.author_id);
    const idArray = [...ids];
    if (idArray.length === 0) return;

    supabase
      .from("presence")
      .select("user_id, last_seen_at")
      .in("user_id", idArray)
      .then(({ data }) => {
        if (!data) return;
        const now = Date.now();
        const online = new Set<string>();
        for (const row of data) {
          if (now - new Date(row.last_seen_at).getTime() <= ONLINE_THRESHOLD_MS) {
            online.add(row.user_id);
          }
        }
        setOnlineSet(online);
      });
  }, [question, answers]);

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

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <main className="min-h-screen p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm mb-8">
            <div className="h-7 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
              <div className="h-4 w-40 bg-slate-100 dark:bg-slate-600 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-600 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-600 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-6 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                  <div className="h-4 w-36 bg-slate-100 dark:bg-slate-600 rounded animate-pulse" />
                </div>
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-600 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  /* ── Not found ── */
  if (notFound) {
    return (
      <main className="min-h-screen p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/app/questions"
              className="text-[#1e293b] dark:text-slate-200 font-medium hover:underline text-sm inline-flex items-center gap-1"
            >
              &larr; Back to Questions
            </Link>
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">Question not found.</p>
          </div>
        </div>
      </main>
    );
  }

  /* ── Error ── */
  if (error || !question) {
    return (
      <main className="min-h-screen p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/app/questions"
              className="text-[#1e293b] dark:text-slate-200 font-medium hover:underline text-sm inline-flex items-center gap-1"
            >
              &larr; Back to Questions
            </Link>
          </div>
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-red-400 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-red-600 dark:text-red-300 font-medium">{error ?? "Something went wrong."}</p>
          </div>
        </div>
      </main>
    );
  }

  /* ── Main view ── */
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/app/questions"
            className="text-[#1e293b] font-medium hover:underline text-sm inline-flex items-center gap-1"
          >
            &larr; Back to Questions
          </Link>
        </div>

        {/* ── Question card ── */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 md:p-8 shadow-sm mb-8">
          <h1 className="text-2xl font-bold text-[#1e293b] dark:text-slate-100 mb-4">{question.title}</h1>

          <div className="flex items-center gap-3 mb-5">
            <div className="relative">
              <Avatar
                fullName={question.author_name}
                avatarUrl={question.author_avatar_url}
                size="sm"
              />
              {onlineSet.has(question.author_id) && (
                <span
                  className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"
                  title="Online"
                />
              )}
            </div>
            <span className="text-sm font-medium text-[#1e293b] dark:text-slate-200">{question.author_name}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(question.created_at)}</span>
          </div>

          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{question.body}</p>
        </div>

        {/* ── Answers section ── */}
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-semibold text-[#1e293b] dark:text-slate-100">Answers</h2>
          <span className="text-sm text-slate-400 dark:text-slate-500">({answers.length})</span>
        </div>

        {answers.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-emerald-400 dark:text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">No answers yet.</p>
          </div>
        ) : (
          <ul className="space-y-4 mb-8">
            {answers.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <Avatar
                      fullName={a.author_name}
                      avatarUrl={a.author_avatar_url}
                      size="sm"
                    />
                    {onlineSet.has(a.author_id) && (
                      <span
                        className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"
                        title="Online"
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium text-[#1e293b] dark:text-slate-200">{a.author_name}</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(a.created_at)}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{a.body}</p>
              </li>
            ))}
          </ul>
        )}

        {/* ── Answer form — tutor/admin only ── */}
        {canAnswer && (
          <form
            onSubmit={handleSubmitAnswer}
            className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm"
          >
            <label className="block text-sm font-medium text-[#1e293b] dark:text-slate-200 mb-3">
              Your Answer
            </label>
            <textarea
              value={answerBody}
              onChange={(e) => setAnswerBody(e.target.value)}
              required
              rows={5}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1e293b] dark:focus:border-slate-400 focus:ring-1 focus:ring-[#1e293b]/20 dark:focus:ring-slate-400/30 transition-colors resize-none"
              placeholder="Write your answer..."
            />
            <div className="mt-4">
              <button
                type="submit"
                disabled={submitting || !answerBody.trim()}
                className="text-white bg-[#1e293b] dark:bg-emerald-600 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#334155] dark:hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Posting..." : "Post Answer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
