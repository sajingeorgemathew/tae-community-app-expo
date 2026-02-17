"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";
import { useAppMetrics } from "@/src/lib/AppMetricsContext";

const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

interface FeedRow {
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

interface Question {
  id: string;
  title: string;
  body: string;
  author_id: string;
  created_at: string;
  author_name: string;
  author_avatar_url: string | null;
  answer_count: number;
  latest_replier_name: string | null;
  latest_replier_avatar_url: string | null;
  latest_replier_role: string | null;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { resolveAvatarUrls } = useAvatarUrls();
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());
  const { refreshMetrics } = useAppMetrics();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchQuestions() {
    const { data, error: fetchError } = await supabase.rpc(
      "get_questions_feed",
      { limit_count: 30 }
    );

    if (fetchError) {
      console.error("Error fetching questions:", fetchError.message, fetchError.details);
      setError("Failed to load questions.");
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as FeedRow[];

    // Collect all unique avatar paths (authors + latest repliers)
    const avatarProfiles: { id: string; avatar_path: string | null }[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (!seen.has(row.author_id)) {
        seen.add(row.author_id);
        avatarProfiles.push({ id: row.author_id, avatar_path: row.author_avatar_path });
      }
      if (row.latest_replier_id && !seen.has(row.latest_replier_id)) {
        seen.add(row.latest_replier_id);
        avatarProfiles.push({ id: row.latest_replier_id, avatar_path: row.latest_replier_avatar_path });
      }
    }
    const avatarUrlMap = await resolveAvatarUrls(avatarProfiles);

    // Ticket 53: fetch presence for authors
    const authorIds = [...seen];
    try {
      const { data: presenceData } = await supabase
        .from("presence")
        .select("user_id, last_seen_at")
        .in("user_id", authorIds);
      if (presenceData) {
        const now = Date.now();
        const online = new Set<string>();
        for (const row of presenceData) {
          if (now - new Date(row.last_seen_at).getTime() <= ONLINE_THRESHOLD_MS) {
            online.add(row.user_id);
          }
        }
        setOnlineSet(online);
      }
    } catch {
      // Presence fetch failed — show no dots
    }

    const mapped: Question[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      author_id: row.author_id,
      created_at: row.created_at,
      author_name: row.author_name ?? "Unknown",
      author_avatar_url: avatarUrlMap[row.author_id] ?? null,
      answer_count: row.answer_count,
      latest_replier_name: row.latest_replier_name ?? null,
      latest_replier_avatar_url: row.latest_replier_id
        ? avatarUrlMap[row.latest_replier_id] ?? null
        : null,
      latest_replier_role: row.latest_replier_role ?? null,
    }));

    setQuestions(mapped);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);

        // Mark Q&A activity as seen for badge tracking
        try {
          await supabase
            .from("qa_activity_reads")
            .upsert(
              { user_id: session.user.id, last_seen_at: new Date().toISOString() },
              { onConflict: "user_id" }
            );
          // Refresh shared metrics so sidebar badge updates immediately
          refreshMetrics();
        } catch (err) {
          console.error("Failed to update qa_activity_reads", err);
        }
      }
      await fetchQuestions();
    }
    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId || !title.trim() || !body.trim()) return;

    setSubmitting(true);
    const { error: insertError } = await supabase
      .from("questions")
      .insert({ title: title.trim(), body: body.trim(), author_id: currentUserId });

    if (insertError) {
      console.error("Error creating question:", insertError.message);
      alert("Failed to create question.");
      setSubmitting(false);
      return;
    }

    setTitle("");
    setBody("");
    setShowForm(false);
    setSubmitting(false);
    setLoading(true);
    await fetchQuestions();
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.slice(0, max).trimEnd() + "…";
  }

  function renderReplyPreview(q: Question) {
    if (q.answer_count === 0) {
      return (
        <span className="text-slate-400 italic">No replies yet</span>
      );
    }

    const replierName = q.latest_replier_name ?? "Unknown";
    const showBadge =
      q.latest_replier_role === "tutor" || q.latest_replier_role === "admin";

    if (q.answer_count === 1) {
      return (
        <span>
          <span className="text-emerald-600 font-medium">1 reply</span>
          <span className="text-slate-300 mx-1.5">·</span>
          Replied by{" "}
          <span className="font-medium text-slate-700">{replierName}</span>
          {showBadge && (
            <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700">
              {q.latest_replier_role}
            </span>
          )}
        </span>
      );
    }

    return (
      <span>
        <span className="text-emerald-600 font-medium">{q.answer_count} replies</span>
        <span className="text-slate-300 mx-1.5">·</span>
        Latest:{" "}
        <span className="font-medium text-slate-700">{replierName}</span>
        {showBadge && (
          <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700">
            {q.latest_replier_role}
          </span>
        )}
        {q.answer_count > 2 && (
          <span className="text-slate-400"> + {q.answer_count - 1} more</span>
        )}
      </span>
    );
  }

  /* ───── Loading skeleton ───── */
  if (loading) {
    return (
      <main className="min-h-screen p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-4" />
            <div className="flex items-center justify-between">
              <div>
                <div className="h-7 w-40 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-10 w-36 bg-slate-200 rounded-lg animate-pulse" />
            </div>
          </div>
          {/* Card skeletons */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-5 w-2/3 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/app"
            className="text-[#1e293b] font-medium hover:underline text-sm inline-flex items-center gap-1"
          >
            &larr; Back to App
          </Link>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b]">Questions</h1>
            <p className="text-sm text-slate-500 mt-1">
              Ask questions and get answers from the community
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-white bg-[#1e293b] rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#334155] transition-colors"
          >
            {showForm ? "Cancel" : "Ask a Question"}
          </button>
        </div>

        {/* Ask form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]/20 transition-colors"
                placeholder="What's your question?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-1.5">
                Details
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]/20 transition-colors resize-none"
                placeholder="Provide more context..."
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !body.trim()}
              className="text-white bg-[#1e293b] rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#334155] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Posting..." : "Post Question"}
            </button>
          </form>
        )}

        {/* Empty state */}
        {questions.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              No questions yet
            </p>
            <p className="text-sm text-slate-400">
              Be the first to ask a question!
            </p>
          </div>
        ) : (
          /* Question cards */
          <div className="space-y-4">
            {questions.map((q) => (
              <Link
                key={q.id}
                href={`/app/questions/${q.id}`}
                className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar with online dot */}
                  <div className="relative shrink-0">
                    <Avatar
                      fullName={q.author_name}
                      avatarUrl={q.author_avatar_url}
                      size="md"
                    />
                    {onlineSet.has(q.author_id) && (
                      <span
                        className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-[2px] border-white rounded-full"
                        title="Online"
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1e293b] group-hover:text-emerald-700 transition-colors">
                      {q.title}
                    </p>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      {truncate(q.body, 150)}
                    </p>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-400 mt-2.5">
                      <span className="font-medium text-slate-600">
                        {q.author_name}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span>{formatDate(q.created_at)}</span>
                      <span className="text-slate-300">·</span>
                      {renderReplyPreview(q)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
