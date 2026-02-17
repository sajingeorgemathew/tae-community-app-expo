"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";

type Audience = "all" | "students" | "alumni";

// File validation constants
const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGES = 5;
const MAX_VIDEO = 1;
const MAX_TOTAL_ATTACHMENTS = 6;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
}

export default function NewPostPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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

  function validateImageFiles(files: FileList | File[]): string | null {
    const fileArray = Array.from(files);

    if (fileArray.length > MAX_IMAGES) {
      return `Maximum ${MAX_IMAGES} images allowed`;
    }

    for (const file of fileArray) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return `Invalid image type: ${file.name}. Allowed: JPEG, PNG, WebP`;
      }
      if (file.size > IMAGE_MAX_SIZE) {
        return `Image too large: ${file.name} (${formatFileSize(file.size)}). Max 5MB`;
      }
    }

    return null;
  }

  function validateVideoFile(file: File): string | null {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return `Invalid video type: ${file.name}. Allowed: MP4, WebM`;
    }
    if (file.size > VIDEO_MAX_SIZE) {
      return `Video too large: ${file.name} (${formatFileSize(file.size)}). Max 50MB`;
    }
    return null;
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validationError = validateImageFiles(files);
    if (validationError) {
      setError(validationError);
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    // Check total attachments limit
    const totalAfter = Array.from(files).length + (videoFile ? 1 : 0);
    if (totalAfter > MAX_TOTAL_ATTACHMENTS) {
      setError(`Maximum ${MAX_TOTAL_ATTACHMENTS} total attachments allowed`);
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    setImageFiles(Array.from(files));
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validationError = validateVideoFile(file);
    if (validationError) {
      setError(validationError);
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    // Check total attachments limit
    const totalAfter = imageFiles.length + 1;
    if (totalAfter > MAX_TOTAL_ATTACHMENTS) {
      setError(`Maximum ${MAX_TOTAL_ATTACHMENTS} total attachments allowed`);
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    setVideoFile(file);
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function removeVideo() {
    setVideoFile(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

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

    // Validate link URL if provided
    if (linkUrl.trim()) {
      try {
        new URL(linkUrl.trim());
      } catch {
        setError("Invalid URL format");
        return;
      }
    }

    setSubmitting(true);

    // Step 1: Create post row
    const { data: postData, error: insertError } = await supabase
      .from("posts")
      .insert({
        author_id: userId,
        content: content.trim(),
        audience,
      })
      .select("id")
      .single();

    if (insertError || !postData) {
      setError("Failed to create post");
      setSubmitting(false);
      return;
    }

    const postId = postData.id;

    // Step 2: Upload files to Storage and collect attachment data
    // Note: If uploads fail after post creation, we show error but don't rollback (MVP)
    const attachments: Array<{
      post_id: string;
      uploader_id: string;
      type: "image" | "video" | "link";
      storage_path?: string;
      url?: string;
      mime_type?: string;
      size_bytes?: number;
    }> = [];

    // Upload images
    for (const file of imageFiles) {
      const attachmentId = crypto.randomUUID();
      const ext = getFileExtension(file);
      const storagePath = `posts/${postId}/${attachmentId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        setError(`Failed to upload image: ${file.name}`);
        setSubmitting(false);
        return;
      }

      attachments.push({
        post_id: postId,
        uploader_id: userId,
        type: "image",
        storage_path: storagePath,
        mime_type: file.type,
        size_bytes: file.size,
      });
    }

    // Upload video
    if (videoFile) {
      const attachmentId = crypto.randomUUID();
      const ext = getFileExtension(videoFile);
      const storagePath = `posts/${postId}/${attachmentId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(storagePath, videoFile, {
          contentType: videoFile.type,
          upsert: false,
        });

      if (uploadError) {
        setError(`Failed to upload video: ${videoFile.name}`);
        setSubmitting(false);
        return;
      }

      attachments.push({
        post_id: postId,
        uploader_id: userId,
        type: "video",
        storage_path: storagePath,
        mime_type: videoFile.type,
        size_bytes: videoFile.size,
      });
    }

    // Add link attachment
    if (linkUrl.trim()) {
      attachments.push({
        post_id: postId,
        uploader_id: userId,
        type: "link",
        url: linkUrl.trim(),
      });
    }

    // Step 3: Insert post_attachments rows
    if (attachments.length > 0) {
      const { error: attachError } = await supabase
        .from("post_attachments")
        .insert(attachments);

      if (attachError) {
        setError("Failed to save attachments");
        setSubmitting(false);
        return;
      }
    }

    // Success: redirect to feed
    router.push("/app/feed");
  }

  const audienceOptions: { value: Audience; label: string }[] = [
    { value: "all", label: "All Members" },
    { value: "students", label: "Students" },
    { value: "alumni", label: "Alumni" },
  ];

  if (!userId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-8">
      {/* Back link */}
      <Link
        href="/app/feed"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e293b] hover:text-[#334155] transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Feed
      </Link>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Create New Post</h1>
        <p className="text-sm text-slate-500 mt-1">Share an update with the community</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Composer card */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Content section */}
            <div className="p-5 md:p-6">
              <label htmlFor="content" className="block text-sm font-semibold text-[#1e293b] mb-2">
                Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="What's on your mind?"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] focus:bg-white outline-none transition-colors resize-y"
                required
              />
              <p className="text-xs text-slate-400 mt-1.5 text-right">Markdown supported</p>
            </div>

            <div className="border-t border-slate-100 mx-5 md:mx-6" />

            {/* Audience section */}
            <div className="p-5 md:p-6">
              <label className="block text-sm font-semibold text-[#1e293b] mb-3">
                Audience
              </label>
              <div className="flex flex-wrap gap-2">
                {audienceOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAudience(opt.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      audience === opt.value
                        ? "bg-[#1e293b] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 mx-5 md:mx-6" />

            {/* Link section */}
            <div className="p-5 md:p-6">
              <label htmlFor="linkUrl" className="block text-sm font-semibold text-[#1e293b] mb-2">
                Link <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                <input
                  id="linkUrl"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] focus:bg-white outline-none transition-colors"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 mx-5 md:mx-6" />

            {/* Attachments section */}
            <div className="p-5 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Image upload dropzone */}
                <div>
                  <label className="block text-sm font-semibold text-[#1e293b] mb-2">
                    Images <span className="text-slate-400 font-normal">(max 5, 5MB each)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-slate-200 hover:border-[#1e293b]/40 bg-slate-50/50 hover:bg-slate-50 px-4 py-8 flex flex-col items-center gap-2 transition-colors group"
                  >
                    <svg className="w-8 h-8 text-slate-300 group-hover:text-[#1e293b]/50 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-500 group-hover:text-slate-700">Upload images</span>
                    <span className="text-xs text-slate-400">PNG, JPG, WebP</span>
                  </button>
                  <input
                    ref={imageInputRef}
                    id="images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                {/* Video upload dropzone */}
                <div>
                  <label className="block text-sm font-semibold text-[#1e293b] mb-2">
                    Video <span className="text-slate-400 font-normal">(max 1, 50MB)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-slate-200 hover:border-[#1e293b]/40 bg-slate-50/50 hover:bg-slate-50 px-4 py-8 flex flex-col items-center gap-2 transition-colors group"
                  >
                    <svg className="w-8 h-8 text-slate-300 group-hover:text-[#1e293b]/50 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-500 group-hover:text-slate-700">Upload video</span>
                    <span className="text-xs text-slate-400">MP4, WebM</span>
                  </button>
                  <input
                    ref={videoInputRef}
                    id="video"
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={handleVideoChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Image previews */}
              {imageFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    {imageFiles.length} image{imageFiles.length !== 1 ? "s" : ""} selected
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {imageFiles.map((file, i) => (
                      <div
                        key={i}
                        className="relative group rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
                          <p className="text-[11px] text-slate-400">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                          aria-label={`Remove ${file.name}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video preview */}
              {videoFile && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">1 video selected</p>
                  <div className="relative group rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center gap-3 max-w-xs">
                    <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 truncate">{videoFile.name}</p>
                      <p className="text-[11px] text-slate-400">{formatFileSize(videoFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                      aria-label="Remove video"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Divider before actions */}
            <div className="border-t border-slate-200" />

            {/* Action row */}
            <div className="p-5 md:p-6 flex items-center justify-end gap-3">
              <Link
                href="/app/feed"
                className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-[#1e293b] text-white text-sm font-medium hover:bg-[#334155] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm inline-flex items-center gap-2"
              >
                {submitting && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {submitting ? "Posting..." : "Post Update"}
              </button>
            </div>
          </div>
        </form>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 mt-4">
          By posting, you agree to the Community Guidelines.
        </p>
      </div>
    </main>
  );
}
