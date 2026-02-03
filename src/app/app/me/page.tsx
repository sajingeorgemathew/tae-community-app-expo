"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import PostCard, { Attachment, Emoji, ReactionCounts } from "@/src/components/PostCard";

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

interface ReactionRow {
  post_id: string;
  user_id: string;
  emoji: string;
}

interface Post {
  id: string;
  content: string;
  audience: string;
  created_at: string;
  attachments: Attachment[];
  reactionCounts: ReactionCounts;
  userReactions: Emoji[];
}

export default function MyProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [program, setProgram] = useState("");
  const [gradYear, setGradYear] = useState("");

  useEffect(() => {
    async function fetchMyProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setCurrentUserId(session.user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, program, grad_year, role")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        setMessage({ type: "error", text: "Failed to load profile" });
        setLoading(false);
        return;
      }

      setProfile(data);
      setFullName(data.full_name || "");
      setProgram(data.program || "");
      setGradYear(data.grad_year?.toString() || "");

      // Fetch posts by current user
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, author_id, content, audience, created_at")
        .eq("author_id", session.user.id)
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

      // Fetch reactions for all posts
      const reactionsByPost: Record<string, ReactionRow[]> = {};
      if (postIds.length > 0) {
        const { data: reactionsData } = await supabase
          .from("post_reactions")
          .select("post_id, user_id, emoji")
          .in("post_id", postIds);

        const reactionRows = (reactionsData ?? []) as ReactionRow[];
        for (const r of reactionRows) {
          if (!reactionsByPost[r.post_id]) {
            reactionsByPost[r.post_id] = [];
          }
          reactionsByPost[r.post_id].push(r);
        }
      }

      setPosts(
        rows.map((row) => {
          const postReactions = reactionsByPost[row.id] ?? [];

          // Compute counts
          const reactionCounts: ReactionCounts = {};
          for (const r of postReactions) {
            reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
          }

          // Get current user's reactions
          const userReactions = postReactions
            .filter((r) => r.user_id === session.user.id)
            .map((r) => r.emoji as Emoji);

          return {
            id: row.id,
            content: row.content,
            audience: row.audience,
            created_at: row.created_at,
            attachments: attachmentsByPost[row.id] ?? [],
            reactionCounts,
            userReactions,
          };
        })
      );

      setLoading(false);
    }

    fetchMyProfile();
  }, [router]);

  function handleEdit() {
    setEditing(true);
    setMessage(null);
  }

  function handleCancel() {
    // Reset form to original values
    setFullName(profile?.full_name || "");
    setProgram(profile?.program || "");
    setGradYear(profile?.grad_year?.toString() || "");
    setEditing(false);
    setMessage(null);
  }

  async function handleSave() {
    if (!profile) return;

    setSaving(true);
    setMessage(null);

    const updates = {
      full_name: fullName.trim() || null,
      program: program.trim() || null,
      grad_year: gradYear ? parseInt(gradYear, 10) : null,
    };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (error) {
      setMessage({ type: "error", text: "Failed to save changes" });
    } else {
      // Update local state with new values
      setProfile({
        ...profile,
        full_name: updates.full_name,
        program: updates.program,
        grad_year: updates.grad_year,
      });
      setEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully" });
    }
    setSaving(false);
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

  async function handleReactionToggle(postId: string, emoji: Emoji) {
    if (!currentUserId) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const hasReacted = post.userReactions.includes(emoji);

    if (hasReacted) {
      // Remove reaction
      const { error } = await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUserId)
        .eq("emoji", emoji);

      if (error) {
        console.error("Error removing reaction:", error.message);
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                reactionCounts: {
                  ...p.reactionCounts,
                  [emoji]: (p.reactionCounts[emoji] ?? 1) - 1,
                },
                userReactions: p.userReactions.filter((e) => e !== emoji),
              }
            : p
        )
      );
    } else {
      // Add reaction
      const { error } = await supabase
        .from("post_reactions")
        .insert({ post_id: postId, user_id: currentUserId, emoji });

      if (error) {
        console.error("Error adding reaction:", error.message);
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                reactionCounts: {
                  ...p.reactionCounts,
                  [emoji]: (p.reactionCounts[emoji] ?? 0) + 1,
                },
                userReactions: [...p.userReactions, emoji],
              }
            : p
        )
      );
    }
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
          &larr; Back to Home
        </Link>
      </div>

      <div className="max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">My Profile</h1>
          {!editing && (
            <button
              onClick={handleEdit}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Edit
            </button>
          )}
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Program</label>
              <input
                type="text"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Graduation Year</label>
              <input
                type="number"
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p>{profile?.full_name || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Program</p>
              <p>{profile?.program || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Graduation Year</p>
              <p>{profile?.grad_year || "Not specified"}</p>
            </div>
            {profile?.role && (
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                  {profile.role}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">My Posts</h2>
          {posts.length === 0 ? (
            <p className="text-gray-500">No posts yet.</p>
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => (
                <li key={post.id}>
                  <PostCard
                    postId={post.id}
                    content={post.content}
                    audience={post.audience}
                    createdAt={post.created_at}
                    attachments={post.attachments}
                    canDelete={!!currentUserId}
                    onDelete={() => handleDelete(post.id)}
                    reactionCounts={post.reactionCounts}
                    userReactions={post.userReactions}
                    onReactionToggle={(emoji) => handleReactionToggle(post.id, emoji)}
                    currentUserId={currentUserId}
                    mediaSize="profile"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
