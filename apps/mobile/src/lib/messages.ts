import type {
  ConversationListItem,
  MessageWithAttachments,
} from "@tae/shared";
import { createSignedUrlsBatch, STORAGE_BUCKETS } from "@tae/shared";
import { supabase } from "./supabase";
import { getCachedSignedUrl } from "./posts";

// ---------------------------------------------------------------------------
// Conversations list
// ---------------------------------------------------------------------------

export async function fetchMyConversations(): Promise<ConversationListItem[]> {
  const { data, error } = await supabase.rpc("get_my_conversations");
  if (error) throw new Error(error.message);
  return (data ?? []) as ConversationListItem[];
}

// ---------------------------------------------------------------------------
// Conversation messages
// ---------------------------------------------------------------------------

const MESSAGES_LIMIT = 100;

export async function fetchConversationMessages(
  conversationId: string,
): Promise<MessageWithAttachments[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, content, created_at, updated_at, message_attachments(id, message_id, type, storage_path, mime_type, size_bytes)",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(MESSAGES_LIMIT);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MessageWithAttachments[];
}

// ---------------------------------------------------------------------------
// Signed URLs for message attachments
// ---------------------------------------------------------------------------

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 50 * 60 * 1000;

function getCachedMessageUrl(path: string): string | null {
  const entry = signedUrlCache.get(path);
  if (entry && Date.now() < entry.expiresAt) return entry.url;
  signedUrlCache.delete(path);
  return null;
}

export async function resolveMessageSignedUrls(
  paths: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uncached: string[] = [];

  for (const p of paths) {
    const cached = getCachedMessageUrl(p);
    if (cached) {
      result.set(p, cached);
    } else {
      uncached.push(p);
    }
  }

  if (uncached.length > 0) {
    const signed = await createSignedUrlsBatch(
      supabase,
      STORAGE_BUCKETS.MESSAGE_MEDIA,
      uncached,
    );
    const now = Date.now();
    uncached.forEach((p, i) => {
      const url = signed[i]?.signedUrl;
      if (url) {
        signedUrlCache.set(p, { url, expiresAt: now + CACHE_TTL_MS });
        result.set(p, url);
      }
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Avatar signed URLs (for conversation list)
// ---------------------------------------------------------------------------

export async function resolveAvatarUrl(
  path: string,
): Promise<string | null> {
  const cached = getCachedSignedUrl(path);
  if (cached) return cached;

  const signed = await createSignedUrlsBatch(
    supabase,
    STORAGE_BUCKETS.PROFILE_AVATARS,
    [path],
  );
  return signed[0]?.signedUrl ?? null;
}
