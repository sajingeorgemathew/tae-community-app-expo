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
        <span className="text-gray-400 italic">No replies yet</span>
      );
    }

    const replierName = q.latest_replier_name ?? "Unknown";
    const showBadge =
      q.latest_replier_role === "tutor" || q.latest_replier_role === "admin";

    if (q.answer_count === 1) {
      return (
        <span>
          1 reply · Replied by{" "}
          <span className="font-medium">{replierName}</span>
          {showBadge && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 capitalize">
              {q.latest_replier_role}
            </span>
          )}
        </span>
      );
    }

    return (
      <span>
        {q.answer_count} replies · Latest:{" "}
        <span className="font-medium">{replierName}</span>
        {showBadge && (
          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 capitalize">
            {q.latest_replier_role}
          </span>
        )}
        {q.answer_count > 2 && (
          <span className="text-gray-400"> + {q.answer_count - 1} more</span>
        )}
      </span>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mb-6">
        <Link href="/app" className="text-blue-600 hover:underline text-sm">
          &larr; Back to App
        </Link>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Questions</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Ask a Question"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 border rounded p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="w-full border rounded px-3 py-2"
              placeholder="What's your question?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Details</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={4}
              className="w-full border rounded px-3 py-2"
              placeholder="Provide more context..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !body.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post Question"}
          </button>
        </form>
      )}

      {questions.length === 0 ? (
        <p className="text-gray-500">No questions yet. Be the first to ask!</p>
      ) : (
        <ul className="space-y-3">
          {questions.map((q) => (
            <li key={q.id}>
              <Link
                href={`/app/questions/${q.id}`}
                className="block border rounded p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar
                      fullName={q.author_name}
                      avatarUrl={q.author_avatar_url}
                      size="md"
                    />
                    {onlineSet.has(q.author_id) && (
                      <span
                        className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
                        title="Online"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{q.title}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {truncate(q.body, 150)}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {q.author_name} · {formatDate(q.created_at)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {renderReplyPreview(q)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
