import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export interface Attachment {
  id: string;
  type: "image" | "video" | "link";
  signedUrl?: string;
  linkUrl?: string;
}

export const EMOJI_SET = ["❤️", "👍", "😂"] as const;
export type Emoji = (typeof EMOJI_SET)[number];

export interface ReactionCounts {
  [emoji: string]: number;
}

interface Comment {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PostCardProps {
  postId?: string;
  content: string;
  audience: string;
  authorName?: string;
  authorId?: string;
  createdAt: string;
  attachments: Attachment[];
  canDelete?: boolean;
  onDelete?: () => void;
  reactionCounts?: ReactionCounts;
  userReactions?: Emoji[];
  onReactionToggle?: (emoji: Emoji) => void;
  currentUserId?: string | null;
  isAdmin?: boolean;
  mediaSize?: "feed" | "profile";
}

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

export default function PostCard({
  postId,
  content,
  audience,
  authorName,
  authorId,
  createdAt,
  attachments,
  canDelete,
  onDelete,
  reactionCounts = {},
  userReactions = [],
  onReactionToggle,
  currentUserId,
  isAdmin = false,
  mediaSize = "feed",
}: PostCardProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (!postId || !showComments) return;

    async function fetchComments() {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from("post_comments")
        .select("id, author_id, content, created_at, updated_at, profiles(full_name)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error.message);
        setLoadingComments(false);
        return;
      }

      const mapped = (data ?? []).map((c: { id: string; author_id: string; content: string; created_at: string; updated_at: string; profiles: { full_name: string | null } | { full_name: string | null }[] | null }) => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        return {
          id: c.id,
          author_id: c.author_id,
          author_name: profile?.full_name ?? "Unknown",
          content: c.content,
          created_at: c.created_at,
          updated_at: c.updated_at,
        };
      });
      setComments(mapped);
      setLoadingComments(false);
    }

    fetchComments();
  }, [postId, showComments]);

  async function handleAddComment() {
    if (!postId || !currentUserId || !newComment.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, author_id: currentUserId, content: newComment.trim() })
      .select("id, author_id, content, created_at, updated_at, profiles(full_name)")
      .single();

    if (error) {
      console.error("Error adding comment:", error.message);
      setSubmitting(false);
      return;
    }

    const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
    setComments((prev) => [
      ...prev,
      {
        id: data.id,
        author_id: data.author_id,
        author_name: profile?.full_name ?? "Unknown",
        content: data.content,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    ]);
    setNewComment("");
    setSubmitting(false);
  }

  async function handleEditSave(commentId: string) {
    if (!editContent.trim()) return;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("post_comments")
      .update({ content: editContent.trim(), updated_at: now })
      .eq("id", commentId);

    if (error) {
      console.error("Error updating comment:", error.message);
      return;
    }

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, content: editContent.trim(), updated_at: now } : c
      )
    );
    setEditingId(null);
    setEditContent("");
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;

    const { error } = await supabase.from("post_comments").delete().eq("id", commentId);

    if (error) {
      console.error("Error deleting comment:", error.message);
      return;
    }

    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  function canEditComment(comment: Comment): boolean {
    return currentUserId === comment.author_id;
  }

  function canDeleteComment(comment: Comment): boolean {
    return currentUserId === comment.author_id || isAdmin;
  }

  return (
    <div className="border rounded p-4 max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        {authorName && (
          authorId ? (
            <Link href={`/app/profile/${authorId}`} className="font-medium text-blue-600 hover:underline">
              {authorName}
            </Link>
          ) : (
            <p className="font-medium">{authorName}</p>
          )
        )}
        <div className={`flex items-center gap-2 ${authorName ? "" : "ml-auto"}`}>
          {audience !== "all" && (
            <span className="text-xs bg-gray-200 px-2 py-1 rounded capitalize">
              {audience}
            </span>
          )}
          <span className="text-xs text-gray-500">{formatDate(createdAt)}</span>
        </div>
      </div>
      <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
      {attachments.length > 0 && (
        <div className="mt-3 space-y-2 max-w-full overflow-hidden">
          {attachments.map((att) => {
            if (att.type === "image" && att.signedUrl) {
              return (
                <img
                  key={att.id}
                  src={att.signedUrl}
                  alt="Attachment"
                  className={
                    mediaSize === "feed"
                      ? "max-w-[520px] w-full h-auto object-contain rounded"
                      : "w-full max-w-full h-auto object-contain rounded"
                  }
                />
              );
            }
            if (att.type === "video" && att.signedUrl) {
              return (
                <video
                  key={att.id}
                  src={att.signedUrl}
                  controls
                  className={
                    mediaSize === "feed"
                      ? "max-w-[640px] w-full h-auto rounded"
                      : "w-full max-w-full h-auto rounded"
                  }
                  style={{ maxHeight: mediaSize === "feed" ? "380px" : "420px" }}
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
                  className="text-blue-600 hover:underline block break-all"
                >
                  {att.linkUrl}
                </a>
              );
            }
            return null;
          })}
        </div>
      )}
      {onReactionToggle && (
        <div className="mt-3 pt-3 border-t flex gap-2">
          {EMOJI_SET.map((emoji) => {
            const count = reactionCounts[emoji] ?? 0;
            const isActive = userReactions.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => onReactionToggle(emoji)}
                className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                  isActive
                    ? "bg-blue-100 border border-blue-300"
                    : "bg-gray-100 hover:bg-gray-200 border border-transparent"
                }`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="text-gray-600">{count}</span>}
              </button>
            );
          })}
        </div>
      )}
      {canDelete && onDelete && (
        <div className="mt-3 pt-3 border-t">
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
        </div>
      )}
      {postId && currentUserId && (
        <div className="mt-3 pt-3 border-t">
          <button
            onClick={() => setShowComments((v) => !v)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {showComments ? "Hide comments" : `Comments${comments.length > 0 ? ` (${comments.length})` : ""}`}
          </button>

          {showComments && (
            <div className="mt-3 space-y-3">
              {loadingComments ? (
                <p className="text-sm text-gray-500">Loading comments...</p>
              ) : (
                <>
                  {comments.length === 0 && (
                    <p className="text-sm text-gray-500">No comments yet.</p>
                  )}
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded p-2 text-sm">
                      {editingId === comment.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditSave(comment.id)}
                              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditContent(""); }}
                              className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-700">{comment.author_name}</span>
                            <span className="text-xs text-gray-400">
                              {formatDate(comment.created_at)}
                              {comment.updated_at !== comment.created_at && " (edited)"}
                            </span>
                          </div>
                          <p className="text-gray-600 whitespace-pre-wrap">{comment.content}</p>
                          <div className="mt-1 flex gap-2">
                            {canEditComment(comment) && (
                              <button
                                onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Edit
                              </button>
                            )}
                            {canDeleteComment(comment) && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-xs text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={submitting || !newComment.trim()}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "..." : "Post"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
