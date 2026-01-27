"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";

interface PostRow {
  id: string;
  author_id: string;
  content: string;
  audience: string;
  created_at: string;
  profiles: { full_name: string | null }[];
}

interface AttachmentRow {
  id: string;
  post_id: string;
  type: "image" | "video" | "link";
  storage_path: string | null;
  url: string | null;
}

interface Attachment {
  id: string;
  type: "image" | "video" | "link";
  signedUrl?: string;
  linkUrl?: string;
}

interface Post {
  id: string;
  author_id: string;
  content: string;
  audience: string;
  created_at: string;
  author_name: string;
  attachments: Attachment[];
}

type AudienceFilter = "all" | "students" | "alumni";

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AudienceFilter>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // Get current user session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setCurrentUserId(session.user.id);

        // Fetch user profile to check admin role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "admin") {
          setIsAdmin(true);
        }
      }

      // Fetch posts
      const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, content, audience, created_at, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Error fetching posts:", error.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as PostRow[];
      const postIds = rows.map((r) => r.id);

      // Fetch attachments for all posts
      const attachmentsByPost: Record<string, Attachment[]> = {};
      if (postIds.length > 0) {
        const { data: attachData } = await supabase
          .from("post_attachments")
          .select("id, post_id, type, storage_path, url")
          .in("post_id", postIds);

        const attachRows = (attachData ?? []) as AttachmentRow[];

        // Generate signed URLs for image/video attachments
        for (const att of attachRows) {
          let attachment: Attachment;

          if (att.type === "link") {
            attachment = { id: att.id, type: "link", linkUrl: att.url ?? undefined };
          } else if (att.storage_path) {
            const { data: signedData } = await supabase.storage
              .from("post-media")
              .createSignedUrl(att.storage_path, 3600);
            attachment = {
              id: att.id,
              type: att.type,
              signedUrl: signedData?.signedUrl,
            };
          } else {
            continue;
          }

          if (!attachmentsByPost[att.post_id]) {
            attachmentsByPost[att.post_id] = [];
          }
          attachmentsByPost[att.post_id].push(attachment);
        }
      }

      setPosts(
        rows.map((row) => ({
          id: row.id,
          author_id: row.author_id,
          content: row.content,
          audience: row.audience,
          created_at: row.created_at,
          author_name: row.profiles[0]?.full_name ?? "Unknown Author",
          attachments: attachmentsByPost[row.id] ?? [],
        }))
      );

      setLoading(false);
    }

    fetchData();
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

  function canDelete(post: Post): boolean {
    if (!currentUserId) return false;
    return post.author_id === currentUserId || isAdmin;
  }

  async function handleDelete(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      console.error("Error deleting post:", error.message);
      alert("Failed to delete post");
      return;
    }

    setPosts((prev) => prev.filter((p) => p.id !== postId));
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
              {post.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {post.attachments.map((att) => {
                    if (att.type === "image" && att.signedUrl) {
                      return (
                        <img
                          key={att.id}
                          src={att.signedUrl}
                          alt="Attachment"
                          className="max-w-xs rounded"
                        />
                      );
                    }
                    if (att.type === "video" && att.signedUrl) {
                      return (
                        <video
                          key={att.id}
                          src={att.signedUrl}
                          controls
                          className="max-w-md rounded"
                        />
                      );
                    }
                    if (att.type === "link" && att.linkUrl) {
                      return (
                        <a
                          key={att.id}
                          href={att.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline block"
                        >
                          {att.linkUrl}
                        </a>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
              {canDelete(post) && (
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
