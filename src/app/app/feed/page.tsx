"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";

interface PostRow {
  id: string;
  content: string;
  audience: string;
  created_at: string;
  profiles: { full_name: string | null }[];
}

interface Post {
  id: string;
  content: string;
  audience: string;
  created_at: string;
  author_name: string;
}

type AudienceFilter = "all" | "students" | "alumni";

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AudienceFilter>("all");

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, audience, created_at, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Error fetching posts:", error.message);
      } else {
        const rows = (data ?? []) as PostRow[];
        setPosts(
          rows.map((row) => ({
            id: row.id,
            content: row.content,
            audience: row.audience,
            created_at: row.created_at,
            author_name: row.profiles[0]?.full_name ?? "Unknown Author",
          }))
        );
      }
      setLoading(false);
    }

    fetchPosts();
  }, []);

  const filteredPosts =
    filter === "all"
      ? posts
      : posts.filter((post) => post.audience === filter);

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Feed</h1>
        <Link
          href="/app/feed/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          New Post
        </Link>
      </div>

      <div className="mb-6 flex gap-2">
        {(["all", "students", "alumni"] as AudienceFilter[]).map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`px-3 py-1 rounded text-sm capitalize ${
              filter === option
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <p className="text-gray-500">No posts found.</p>
      ) : (
        <ul className="space-y-4">
          {filteredPosts.map((post) => (
            <li key={post.id} className="border rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{post.author_name}</p>
                <div className="flex items-center gap-2">
                  {post.audience !== "all" && (
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded capitalize">
                      {post.audience}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatDate(post.created_at)}
                  </span>
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
