import { supabase } from "@/src/lib/supabaseClient";
import type { Attachment } from "@/src/components/PostCard";

interface AttachmentRow {
  id: string;
  post_id: string;
  type: "image" | "video" | "link";
  storage_path: string | null;
  url: string | null;
}

/**
 * Batch-sign all media attachment storage paths in a single Supabase call,
 * then group results by post_id. Link attachments pass through without signing.
 */
export async function signPostAttachments(
  rows: AttachmentRow[]
): Promise<Record<string, Attachment[]>> {
  const attachmentsByPost: Record<string, Attachment[]> = {};

  // Separate media (need signing) from links (no signing)
  const mediaRows: AttachmentRow[] = [];
  for (const att of rows) {
    if (att.type === "link") {
      const attachment: Attachment = { id: att.id, type: "link", linkUrl: att.url ?? undefined };
      if (!attachmentsByPost[att.post_id]) attachmentsByPost[att.post_id] = [];
      attachmentsByPost[att.post_id].push(attachment);
    } else if (att.storage_path) {
      mediaRows.push(att);
    }
    // skip rows without storage_path (same as current behavior)
  }

  if (mediaRows.length === 0) return attachmentsByPost;

  // Batch sign all media paths in one request
  const paths = mediaRows.map((r) => r.storage_path!);
  const { data: signedResults } = await supabase.storage
    .from("post-media")
    .createSignedUrls(paths, 3600);

  // Map signed URLs back to attachments by index
  for (let i = 0; i < mediaRows.length; i++) {
    const att = mediaRows[i];
    const signed = signedResults?.[i];
    const attachment: Attachment = {
      id: att.id,
      type: att.type,
      signedUrl: signed?.error ? undefined : signed?.signedUrl,
    };
    if (!attachmentsByPost[att.post_id]) attachmentsByPost[att.post_id] = [];
    attachmentsByPost[att.post_id].push(attachment);
  }

  return attachmentsByPost;
}
