"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";

interface Profile {
  id: string;
  full_name: string | null;
  program: string | null;
  grad_year: number | null;
  role: string | null;
}

interface PostRow {
  id: string;
  author_id: string;
  content: string;
  audience: string;
  created_at: string;
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
  content: string;
  audience: string;
  created_at: string;
  attachments: Attachment[];
}

export default function ProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, program, grad_year, role")
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(data);

      // Fetch posts by this author
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, author_id, content, audience, created_at")
        .eq("author_id", id)
        .order("created_at", { ascending: false })
        .limit(30);

      const rows = (postsData ?? []) as PostRow[];
      const postIds = rows.map((r) => r.id);

      // Fetch attachments for all posts
      const attachmentsByPost: Record<string, Attachment[]> = {};
      if (postIds.length > 0) {
        const { data: attachData } = await supabase
          .from("post_attachments")
          .select("id, post_id, type, storage_path, url")
          .in("post_id", postIds);

        const attachRows = (attachData ?? []) as AttachmentRow[];

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
          content: row.content,
          audience: row.audience,
          created_at: row.created_at,
          attachments: attachmentsByPost[row.id] ?? [],
        }))
      );

      setLoading(false);
    }

    fetchData();
  }, [id]);

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

  if (notFound) {
    return (
      <main className="min-h-screen p-8">
        <div className="mb-6">
          <Link href="/app/directory" className="text-blue-600 hover:underline text-sm">
            &larr; Back to Directory
          </Link>
        </div>
        <p className="text-gray-500">Profile not found</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mb-6">
        <Link href="/app/directory" className="text-blue-600 hover:underline text-sm">
          &larr; Back to Directory
        </Link>
      </div>

      <div className="max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-semibold">
            {profile?.full_name || "Unnamed Member"}
          </h1>
          {profile?.role && (
            <span className="text-xs bg-gray-200 px-2 py-1 rounded">
              {profile.role}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Program</p>
            <p>{profile?.program || "Not specified"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Graduation Year</p>
            <p>{profile?.grad_year || "Not specified"}</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Posts by this member</h2>
          {posts.length === 0 ? (
            <p className="text-gray-500">No posts yet.</p>
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => (
                <li key={post.id} className="border rounded p-4">
                  <div className="flex items-center justify-end mb-2">
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
