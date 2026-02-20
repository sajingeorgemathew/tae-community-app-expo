import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import Avatar from "./Avatar";

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
  authorAvatarUrl?: string | null;
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
  authorAvatarUrl,
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
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

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

  const totalReactions = Object.values(reactionCounts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Author Header */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-start justify-between">
          {authorName && (
            <div className="flex items-center gap-3 min-w-0">
              {authorId ? (
                <Link href={`/app/profile/${authorId}`} className="shrink-0">
                  <Avatar fullName={authorName} avatarUrl={authorAvatarUrl} size="md" />
                </Link>
              ) : (
                <Avatar fullName={authorName} avatarUrl={authorAvatarUrl} size="md" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {authorId ? (
                    <Link
                      href={`/app/profile/${authorId}`}
                      className="font-semibold text-gray-900 hover:text-slate-700 transition-colors truncate"
                    >
                      {authorName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-gray-900 truncate">{authorName}</span>
                  )}
                  {audience !== "all" && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium capitalize">
                      {audience}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(createdAt)}</p>
              </div>
            </div>
          )}

          {/* Three-dot menu for delete */}
          {canDelete && onDelete && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-3 pb-1">
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="px-5 pt-2 pb-1 space-y-2 max-w-full overflow-hidden">
          {attachments.map((att) => {
            if (att.type === "image" && att.signedUrl) {
              return (
                <img
                  key={att.id}
                  src={att.signedUrl}
                  alt="Attachment"
                  loading="lazy"
                  decoding="async"
                  className={
                    mediaSize === "feed"
                      ? "max-w-[520px] w-full h-auto object-contain rounded-lg"
                      : "w-full max-w-full h-auto object-contain rounded-lg"
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
                  preload="metadata"
                  playsInline
                  className={
                    mediaSize === "feed"
                      ? "max-w-[640px] w-full h-auto rounded-lg"
                      : "w-full max-w-full h-auto rounded-lg"
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
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline text-sm break-all"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {att.linkUrl}
                </a>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Reactions & Actions Row */}
      {onReactionToggle && (
        <div className="px-5 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {EMOJI_SET.map((emoji) => {
                const count = reactionCounts[emoji] ?? 0;
                const isActive = userReactions.includes(emoji);
                return (
                  <button
                    key={emoji}
                    onClick={() => onReactionToggle(emoji)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition-colors ${
                      isActive
                        ? "bg-blue-50 border border-blue-200 text-blue-700"
                        : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span>{emoji}</span>
                    {count > 0 && <span className="text-xs font-medium">{count}</span>}
                  </button>
                );
              })}
            </div>

            {/* Comment toggle */}
            {postId && currentUserId && (
              <button
                onClick={() => setShowComments((v) => !v)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
              >
                {showComments
                  ? "Hide comments"
                  : comments.length > 0
                    ? `View ${comments.length} comments`
                    : totalReactions > 0
                      ? "View comments"
                      : "Comment"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comments Section */}
      {postId && currentUserId && showComments && (
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Comments</p>

          {/* Comment Input */}
          <div className="flex gap-3 mb-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y min-h-[40px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-300 placeholder:text-gray-400 transition"
              rows={1}
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
              className="self-end rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {submitting ? "..." : "Post Comment"}
            </button>
          </div>

          {/* Comments List */}
          {loadingComments ? (
            <div className="flex items-center gap-2 py-3">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading comments...</p>
            </div>
          ) : (
            <>
              {comments.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-3">
                  No comments yet. Be the first to share your thoughts!
                </p>
              )}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg bg-gray-50 p-3">
                    {editingId === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-300 transition"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditSave(comment.id)}
                            className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditContent(""); }}
                            className="text-xs bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800 text-sm">{comment.author_name}</span>
                          <span className="text-xs text-gray-400">
                            {formatDate(comment.created_at)}
                            {comment.updated_at !== comment.created_at && " (edited)"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                        {(canEditComment(comment) || canDeleteComment(comment)) && (
                          <div className="mt-2 flex gap-3">
                            {canEditComment(comment) && (
                              <button
                                onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                                className="text-xs text-gray-500 hover:text-slate-700 font-medium transition-colors"
                              >
                                Edit
                              </button>
                            )}
                            {canDeleteComment(comment) && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-xs text-gray-500 hover:text-red-600 font-medium transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
