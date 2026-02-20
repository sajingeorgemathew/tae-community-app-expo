"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";
import PostCard, { Attachment, Emoji, ReactionCounts } from "@/src/components/PostCard";
import { signPostAttachments } from "@/src/lib/signPostAttachments";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_TAGS = 12;
const MAX_TAG_LEN = 24;
const PAGE_SIZE = 20;

interface Profile {
  id: string;
  full_name: string | null;
  program: string | null;
  grad_year: number | null;
  role: string | null;
  avatar_path: string | null;
  headline: string | null;
  skills: string[];
}

interface MissingItem {
  key: "avatar" | "headline" | "skills" | "program_year";
  label: string;
}

function computeCompleteness(p: Profile): { percent: number; missing: MissingItem[] } {
  const missing: MissingItem[] = [];
  if (!p.avatar_path) missing.push({ key: "avatar", label: "Add a profile photo" });
  if (!p.headline?.trim()) missing.push({ key: "headline", label: "Write a headline" });
  if (!p.skills || p.skills.length === 0) missing.push({ key: "skills", label: "Add at least one skill" });
  if (!p.program?.trim() || !p.grad_year) missing.push({ key: "program_year", label: "Set program & graduation year" });
  const filled = 4 - missing.length;
  return { percent: filled * 25, missing };
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [program, setProgram] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [headline, setHeadline] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headlineRef = useRef<HTMLInputElement>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);
  const programRef = useRef<HTMLInputElement>(null);
  const gradYearRef = useRef<HTMLInputElement>(null);
  const completenessRef = useRef<HTMLDivElement>(null);
  const { getAvatarUrl } = useAvatarUrls();

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
        .select("id, full_name, program, grad_year, role, avatar_path, headline, skills")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        setMessage({ type: "error", text: "Failed to load profile" });
        setLoading(false);
        return;
      }

      const profileData: Profile = {
        ...data,
        skills: data.skills ?? [],
      };

      setProfile(profileData);
      setFullName(profileData.full_name || "");
      setProgram(profileData.program || "");
      setGradYear(profileData.grad_year?.toString() || "");
      setHeadline(profileData.headline || "");
      setSkills(profileData.skills);

      // Get signed URL for existing avatar via cached helper
      if (profileData.avatar_path) {
        const url = await getAvatarUrl(profileData.avatar_path);
        if (url) setAvatarSignedUrl(url);
      }

      // Fetch posts by current user
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, author_id, content, audience, created_at")
        .eq("author_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      const rows = (postsData ?? []) as PostRow[];
      setHasMore(rows.length === PAGE_SIZE);
      const postIds = rows.map((r) => r.id);

      // Fetch attachments for all posts and batch-sign media URLs
      let attachmentsByPost: Record<string, Attachment[]> = {};
      if (postIds.length > 0) {
        const { data: attachData } = await supabase
          .from("post_attachments")
          .select("id, post_id, type, storage_path, url")
          .in("post_id", postIds);

        attachmentsByPost = await signPostAttachments((attachData ?? []) as AttachmentRow[]);
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

  async function loadMorePosts() {
    if (loadingMore || !hasMore || !currentUserId || posts.length === 0) return;
    setLoadingMore(true);

    const cursor = posts[posts.length - 1].created_at;

    const { data: postsData } = await supabase
      .from("posts")
      .select("id, author_id, content, audience, created_at")
      .eq("author_id", currentUserId)
      .lt("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    const rows = (postsData ?? []) as PostRow[];
    setHasMore(rows.length === PAGE_SIZE);

    if (rows.length > 0) {
      const postIds = rows.map((r) => r.id);

      // Fetch attachments
      let attachmentsByPost: Record<string, Attachment[]> = {};
      const { data: attachData } = await supabase
        .from("post_attachments")
        .select("id, post_id, type, storage_path, url")
        .in("post_id", postIds);
      attachmentsByPost = await signPostAttachments((attachData ?? []) as AttachmentRow[]);

      // Fetch reactions
      const reactionsByPost: Record<string, ReactionRow[]> = {};
      const { data: reactionsData } = await supabase
        .from("post_reactions")
        .select("post_id, user_id, emoji")
        .in("post_id", postIds);
      const reactionRows = (reactionsData ?? []) as ReactionRow[];
      for (const r of reactionRows) {
        if (!reactionsByPost[r.post_id]) reactionsByPost[r.post_id] = [];
        reactionsByPost[r.post_id].push(r);
      }

      const newPosts: Post[] = rows.map((row) => {
        const postReactions = reactionsByPost[row.id] ?? [];
        const reactionCounts: ReactionCounts = {};
        for (const r of postReactions) {
          reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
        }
        const userReactions = postReactions
          .filter((r) => r.user_id === currentUserId)
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
      });

      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const unique = newPosts.filter((p) => !existingIds.has(p.id));
        return [...prev, ...unique];
      });
    }

    setLoadingMore(false);
  }

  function handleEdit() {
    setEditing(true);
    setMessage(null);
  }

  function handleCancel() {
    // Reset form to original values
    setFullName(profile?.full_name || "");
    setProgram(profile?.program || "");
    setGradYear(profile?.grad_year?.toString() || "");
    setHeadline(profile?.headline || "");
    setSkills(profile?.skills ?? []);
    setSkillInput("");
    // Clear avatar selection
    setAvatarFile(null);
    setAvatarPreview(null);
    setEditing(false);
    setMessage(null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      setMessage({ type: "error", text: "Only JPEG, PNG, and WebP images are allowed." });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: "error", text: "Image must be 5 MB or smaller." });
      return;
    }

    setMessage(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function addSkill() {
    const tag = skillInput.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LEN);
    if (!tag) return;

    if (skills.length >= MAX_TAGS) {
      setMessage({ type: "error", text: `Maximum ${MAX_TAGS} skills allowed.` });
      return;
    }

    const isDuplicate = skills.some((s) => s.toLowerCase() === tag.toLowerCase());
    if (isDuplicate) {
      setMessage({ type: "error", text: `"${tag}" is already added.` });
      return;
    }

    setSkills((prev) => [...prev, tag]);
    setSkillInput("");
    setMessage(null);
  }

  function removeSkill(index: number) {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!profile || !currentUserId) return;

    setSaving(true);
    setMessage(null);

    let newAvatarPath = profile.avatar_path;

    // Upload avatar if a new file was selected
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() || "jpg";
      // Path convention: avatars/{user_uuid}/{filename}
      const storagePath = `avatars/${currentUserId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-avatars")
        .upload(storagePath, avatarFile, { upsert: true });

      if (uploadError) {
        setMessage({ type: "error", text: `Avatar upload failed: ${uploadError.message}` });
        setSaving(false);
        return;
      }

      // If replacing and old path differs, try to delete old object (best-effort)
      if (profile.avatar_path && profile.avatar_path !== storagePath) {
        await supabase.storage.from("profile-avatars").remove([profile.avatar_path]);
      }

      newAvatarPath = storagePath;
    }

    const updates = {
      full_name: fullName.trim() || null,
      program: program.trim() || null,
      grad_year: gradYear ? parseInt(gradYear, 10) : null,
      headline: headline.trim() || null,
      skills,
      avatar_path: newAvatarPath,
    };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (error) {
      setMessage({ type: "error", text: "Failed to save changes" });
    } else {
      const updatedProfile: Profile = {
        ...profile,
        full_name: updates.full_name,
        program: updates.program,
        grad_year: updates.grad_year,
        headline: updates.headline,
        skills: updates.skills,
        avatar_path: updates.avatar_path,
      };
      setProfile(updatedProfile);

      // Refresh signed URL for the (possibly new) avatar via cached helper
      if (updatedProfile.avatar_path) {
        const url = await getAvatarUrl(updatedProfile.avatar_path);
        if (url) setAvatarSignedUrl(url);
      }

      // Clear file selection
      setAvatarFile(null);
      setAvatarPreview(null);
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

  // Profile completeness (derived from current profile state)
  const completeness = profile ? computeCompleteness(profile) : null;

  function handleAddField(key: MissingItem["key"]) {
    if (!editing) {
      handleEdit();
    }
    // Wait a tick so the form renders before scrolling
    setTimeout(() => {
      let target: HTMLElement | null = null;
      switch (key) {
        case "avatar":
          target = fileInputRef.current;
          fileInputRef.current?.click();
          break;
        case "headline":
          target = headlineRef.current;
          headlineRef.current?.focus();
          break;
        case "skills":
          target = skillInputRef.current;
          skillInputRef.current?.focus();
          break;
        case "program_year":
          target = programRef.current;
          programRef.current?.focus();
          break;
      }
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  // Determine which avatar image to show
  const displayAvatarUrl = avatarPreview || avatarSignedUrl;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50/50">
      {/* Page Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-5 md:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/app"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
            </div>
            <p className="text-sm text-gray-500 ml-8">Manage your personal information and skills</p>
          </div>
          <div className="flex items-center gap-3">
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-800 text-white px-5 py-2 text-sm font-medium hover:bg-slate-700 transition disabled:opacity-50"
                >
                  {saving && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 text-white px-5 py-2 text-sm font-medium hover:bg-slate-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div className="px-6 md:px-8">
          <div className="max-w-5xl mx-auto mt-4">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {message.text}
            </div>
          </div>
        </div>
      )}

      {/* Main Content: 2-column layout */}
      <div className="max-w-5xl mx-auto px-6 py-6 md:px-8 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

          {/* ── Left Column: Profile Card ── */}
          <div className="space-y-6">
            {/* Profile Identity Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Avatar
                    fullName={profile?.full_name || "?"}
                    avatarUrl={displayAvatarUrl}
                    size="xl"
                  />
                  {editing && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition shadow-md"
                      title="Change photo"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {editing && (
                  <p className="text-xs text-gray-400 mt-2">JPEG, PNG, or WebP &middot; 5 MB max</p>
                )}
              </div>

              {/* Name & Headline */}
              <h2 className="text-lg font-semibold text-gray-900 mt-4">
                {profile?.full_name || "Your Name"}
              </h2>
              {profile?.headline && (
                <p className="text-sm text-gray-500 mt-1">{profile.headline}</p>
              )}
              {!profile?.headline && !editing && (
                <p className="text-sm text-gray-400 mt-1 italic">No headline yet</p>
              )}

              {/* Role Badge */}
              {profile?.role && (
                <div className="mt-3">
                  <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-medium capitalize">
                    {profile.role}
                  </span>
                </div>
              )}

              {/* Quick Info */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>{profile?.program || "No program set"}</span>
                </div>
                {profile?.grad_year && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Class of {profile.grad_year}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Completeness Card */}
            {completeness && completeness.percent < 100 && !editing && (
              <div
                ref={completenessRef}
                id="completeness"
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Profile Completeness</h3>
                  <span className="text-sm font-bold text-blue-600">{completeness.percent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${completeness.percent}%` }}
                  />
                </div>
                <ul className="space-y-2">
                  {completeness.missing.map((item) => (
                    <li key={item.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-sm text-gray-600">{item.label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddField(item.key)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium hover:underline"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills in View Mode (left column) */}
            {!editing && profile?.skills && profile.skills.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Form Cards / View Cards ── */}
          <div className="space-y-6">
            {editing ? (
              <>
                {/* Basic Info Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-slate-800 rounded-full" />
                    Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Program</label>
                        <input
                          ref={programRef}
                          type="text"
                          value={program}
                          onChange={(e) => setProgram(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                          placeholder="e.g. Computer Science"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Graduation Year</label>
                        <input
                          ref={gradYearRef}
                          type="number"
                          value={gradYear}
                          onChange={(e) => setGradYear(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                          placeholder="e.g. 2026"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* About Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-600 rounded-full" />
                    About
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Headline</label>
                    <input
                      ref={headlineRef}
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      maxLength={160}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                      placeholder="A short summary about yourself"
                    />
                    <p className="text-xs text-gray-400 mt-1.5 text-right">{headline.length}/160</p>
                  </div>
                </div>

                {/* Skills Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-amber-500 rounded-full" />
                    Skills
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      {skills.length}/{MAX_TAGS}
                    </span>
                  </h3>

                  {/* Skill chips */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {skills.map((skill, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 pl-3 pr-1.5 py-1 text-xs font-medium group"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(i)}
                            className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-blue-100 text-blue-400 hover:text-red-500 transition"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add skill input */}
                  <div className="flex gap-2">
                    <input
                      ref={skillInputRef}
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      maxLength={MAX_TAG_LEN}
                      placeholder="Type a skill and press Enter"
                      className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* View Mode: Basic Info Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-slate-800 rounded-full" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                      <p className="text-sm text-gray-900">{profile?.full_name || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Role</p>
                      {profile?.role ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-medium capitalize">
                          {profile.role}
                        </span>
                      ) : (
                        <p className="text-sm text-gray-900">Not specified</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Program</p>
                      <p className="text-sm text-gray-900">{profile?.program || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Graduation Year</p>
                      <p className="text-sm text-gray-900">{profile?.grad_year || "Not specified"}</p>
                    </div>
                  </div>
                </div>

                {/* View Mode: About Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-600 rounded-full" />
                    About
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {profile?.headline || "No headline added yet."}
                  </p>
                </div>
              </>
            )}

            {/* My Posts Section */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-600 rounded-full" />
                  My Posts
                  {posts.length > 0 && (
                    <span className="text-xs font-normal text-gray-400 ml-1">{posts.length}</span>
                  )}
                </h3>
                <Link
                  href="/app/feed/new"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Post
                </Link>
              </div>
              {posts.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-500 mb-1">No posts published</p>
                  <p className="text-xs text-gray-400 mb-4 max-w-xs mx-auto">
                    Share your thoughts, projects, or insights with the community.
                  </p>
                  <Link
                    href="/app/feed/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create First Post
                  </Link>
                </div>
              ) : (
                <>
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
                  {hasMore && (
                    <div className="pt-4 text-center">
                      <button
                        onClick={loadMorePosts}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                      >
                        {loadingMore && (
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        )}
                        {loadingMore ? "Loading..." : "Load more"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
