"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";

interface ProfileJoin {
  full_name: string | null;
  avatar_path: string | null;
}

interface QuestionRow {
  id: string;
  title: string;
  body: string;
  author_id: string;
  created_at: string;
  profiles: ProfileJoin | ProfileJoin[] | null;
}

interface Question {
  id: string;
  title: string;
  body: string;
  author_id: string;
  created_at: string;
  author_name: string;
  author_avatar_url: string | null;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { resolveAvatarUrls } = useAvatarUrls();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchQuestions() {
    const { data, error: fetchError } = await supabase
      .from("questions")
      .select("id, title, body, author_id, created_at, profiles(full_name, avatar_path)")
      .order("created_at", { ascending: false })
      .limit(30);

    if (fetchError) {
      console.error("Error fetching questions:", fetchError.message);
      setError("Failed to load questions.");
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as QuestionRow[];

    // Resolve avatar URLs
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

    const mapped: Question[] = rows.map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        title: row.title,
        body: row.body,
        author_id: row.author_id,
        created_at: row.created_at,
        author_name: profile?.full_name ?? "Unknown",
        author_avatar_url: avatarUrlMap[row.author_id] ?? null,
      };
    });

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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="mb-6">
          <Link href="/app" className="text-blue-600 hover:underline text-sm">
            &larr; Back to App
          </Link>
        </div>
        <p className="text-red-600">{error}</p>
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
                  <Avatar
                    fullName={q.author_name}
                    avatarUrl={q.author_avatar_url}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{q.title}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {truncate(q.body, 150)}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {q.author_name} · {formatDate(q.created_at)}
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
