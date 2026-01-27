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

  if (!userId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mb-6">
        <Link href="/app/feed" className="text-blue-600 hover:underline text-sm">
          &larr; Back to Feed
        </Link>
      </div>

      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">New Post</h1>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-800">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="content" className="block text-sm text-gray-500 mb-1">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label htmlFor="audience" className="block text-sm text-gray-500 mb-1">
              Audience
            </label>
            <select
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="alumni">Alumni</option>
            </select>
          </div>

          <div>
            <label htmlFor="linkUrl" className="block text-sm text-gray-500 mb-1">
              Link (optional)
            </label>
            <input
              id="linkUrl"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="images" className="block text-sm text-gray-500 mb-1">
              Images (optional, max 5, 5MB each)
            </label>
            <input
              ref={imageInputRef}
              id="images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageChange}
              className="w-full border rounded px-3 py-2"
            />
            {imageFiles.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600">
                {imageFiles.map((file, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span>
                      {file.name} ({formatFileSize(file.size)})
                    </span>
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label htmlFor="video" className="block text-sm text-gray-500 mb-1">
              Video (optional, max 1, 50MB)
            </label>
            <input
              ref={videoInputRef}
              id="video"
              type="file"
              accept="video/mp4,video/webm"
              onChange={handleVideoChange}
              className="w-full border rounded px-3 py-2"
            />
            {videoFile && (
              <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                <span>
                  {videoFile.name} ({formatFileSize(videoFile.size)})
                </span>
                <button
                  type="button"
                  onClick={removeVideo}
                  className="text-red-600 hover:underline text-xs"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post"}
            </button>
            <Link
              href="/app/feed"
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 inline-block"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
