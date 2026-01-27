"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";

type Audience = "all" | "students" | "alumni";

export default function NewPostPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUserId(session.user.id);
    }

    checkAuth();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    if (!userId) {
      setError("Not authenticated");
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from("posts").insert({
      author_id: userId,
      content: content.trim(),
      audience,
    });

    if (insertError) {
      setError("Failed to create post");
      setSubmitting(false);
      return;
    }

    router.push("/app/feed");
  }

  if (!userId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mb-6">
        <Link href="/app/feed" className="text-blue-600 hover:underline text-sm">
          &larr; Back to Feed
        </Link>
      </div>

      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">New Post</h1>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-800">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="content" className="block text-sm text-gray-500 mb-1">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label htmlFor="audience" className="block text-sm text-gray-500 mb-1">
              Audience
            </label>
            <select
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="alumni">Alumni</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post"}
            </button>
            <Link
              href="/app/feed"
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 inline-block"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
