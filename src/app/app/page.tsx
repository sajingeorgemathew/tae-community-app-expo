"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

interface FeedPreviewPost {
  id: string;
  content: string;
  created_at: string;
  author_name: string;
  has_media: boolean;
}

export default function AppPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<FeedPreviewPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUser(session.user);

      // Check admin role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") {
        setIsAdmin(true);
      }

      setLoading(false);

      // Fetch feed preview
      const { data: postRows } = await supabase
        .from("posts")
        .select("id, content, created_at, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(8);

      if (postRows) {
        // Get post IDs to check for attachments
        const postIds = postRows.map((r: Record<string, unknown>) => r.id as string);
        let postsWithMedia = new Set<string>();

        if (postIds.length > 0) {
          const { data: attachData } = await supabase
            .from("post_attachments")
            .select("post_id")
            .in("post_id", postIds);

          if (attachData) {
            postsWithMedia = new Set(attachData.map((a: Record<string, unknown>) => a.post_id as string));
          }
        }

        setPosts(
          postRows.map((row: Record<string, unknown>) => {
            const profiles = row.profiles;
            const profile = Array.isArray(profiles) ? profiles[0] : profiles;
            return {
              id: row.id as string,
              content: row.content as string,
              created_at: row.created_at as string,
              author_name: (profile as Record<string, unknown> | null)?.full_name as string ?? "Unknown",
              has_media: postsWithMedia.has(row.id as string),
            };
          })
        );
      }

      setPostsLoading(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
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

  return (
    <main className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">TAE Community App</h1>
        <span className="text-sm text-gray-500">
          {user?.user_metadata?.full_name || user?.email}
        </span>
      </div>

      <div className="flex gap-8">
        {/* Left Rail */}
        <nav className="w-56 flex-shrink-0 space-y-2">
          <Link
            href="/app/me"
            className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-800"
          >
            My Profile
          </Link>
          <Link
            href="/app/messages"
            className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-800"
          >
            Messages
          </Link>
          <Link
            href="/app/feed?new=1"
            className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-800"
          >
            New Post
          </Link>
          <Link
            href="/app/directory"
            className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-800"
          >
            Directory
          </Link>
          {isAdmin && (
            <Link
              href="/app/admin"
              className="block px-4 py-2 rounded hover:bg-gray-100 text-red-600"
            >
              Admin Dashboard
            </Link>
          )}
          <hr className="my-3" />
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 rounded hover:bg-gray-100 text-gray-500 text-sm"
          >
            Log Out
          </button>
        </nav>

        {/* Main Panel */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold mb-4">Welcome</h2>

          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-700">Recent Posts</h3>
            <Link
              href="/app/feed"
              className="text-blue-600 hover:underline text-sm"
            >
              Go to Feed &rarr;
            </Link>
          </div>

          {postsLoading ? (
            <p className="text-gray-400 text-sm">Loading posts...</p>
          ) : posts.length === 0 ? (
            <p className="text-gray-500">No posts yet.</p>
          ) : (
            <ul className="space-y-3">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="border rounded p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {post.author_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(post.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {truncate(post.content, 150)}
                  </p>
                  {post.has_media && (
                    <span className="text-xs text-gray-400 mt-1 inline-block">
                      📎 Media
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            <Link
              href="/app/feed"
              className="inline-block bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
            >
              Go to Feed
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
