"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import PostCard, { Attachment } from "@/src/components/PostCard";

interface ProfileJoin {
  full_name: string | null;
}

interface PostRow {
  id: string;
  author_id: string;
  content: string;
  audience: string;
  created_at: string;
  profiles: ProfileJoin | ProfileJoin[] | null;
}

interface AttachmentRow {
  id: string;
  post_id: string;
  type: "image" | "video" | "link";
  storage_path: string | null;
  url: string | null;
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
        rows.map((row) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          return {
            id: row.id,
            author_id: row.author_id,
            content: row.content,
            audience: row.audience,
            created_at: row.created_at,
            author_name: profile?.full_name ?? "Unknown Author",
            attachments: attachmentsByPost[row.id] ?? [],
          };
        })
      );

      setLoading(false);
    }

    fetchData();
  }, []);

  const filteredPosts =
    filter === "all"
      ? posts
      : posts.filter((post) => post.audience === filter);

  function canDelete(post: Post): boolean {
    if (!currentUserId) return false;
    return post.author_id === currentUserId || isAdmin;
  }

  async function handleDelete(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    // Fetch attachments to get storage paths for cleanup
    const { data: attachments } = await supabase
      .from("post_attachments")
      .select("storage_path, type")
      .eq("post_id", postId);

    // Delete storage objects for image/video attachments
    const storagePaths = (attachments ?? [])
      .filter((a) => (a.type === "image" || a.type === "video") && a.storage_path)
      .map((a) => a.storage_path as string);

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("post-media")
        .remove(storagePaths);

      if (storageError) {
        console.error("Error deleting storage objects:", storageError.message);
        // Continue with post deletion even if storage cleanup fails
      }
    }

    // Delete the post (cascades to post_attachments rows)
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
        <p className="text-gray-500">
          {posts.length === 0 ? "No posts yet." : "No posts for this filter."}
        </p>
      ) : (
        <ul className="space-y-4">
          {filteredPosts.map((post) => (
            <li key={post.id}>
              <PostCard
                content={post.content}
                audience={post.audience}
                authorName={post.author_name}
                authorId={post.author_id}
                createdAt={post.created_at}
                attachments={post.attachments}
                canDelete={canDelete(post)}
                onDelete={() => handleDelete(post.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
