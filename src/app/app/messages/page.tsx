"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import Avatar from "@/src/components/Avatar";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import { useAppMetrics } from "@/src/lib/AppMetricsContext";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 35 * 1024 * 1024; // 35MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"];

const CONVERSATION_POLL_INTERVAL = 6000; // 6 seconds
const MESSAGES_POLL_INTERVAL = 3000; // 3 seconds
const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

interface Conversation {
  conversation_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar_path: string | null;
  last_message_content: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_unread: boolean;
}

interface Attachment {
  id: string;
  type: "image" | "video";
  storage_path: string;
  mime_type: string | null;
  signedUrl?: string;
}

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  updated_at: string | null;
  attachments?: Attachment[];
}

/* ── Extracted sub-components ── */

function ConversationItem({
  convo,
  isActive,
  avatarUrl,
  isOnline,
  onClick,
  formatTimestamp,
}: {
  convo: Conversation;
  isActive: boolean;
  avatarUrl: string | null;
  isOnline: boolean;
  onClick: () => void;
  formatTimestamp: (d: string | null) => string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 transition-colors duration-150 ${
        isActive
          ? "bg-[#1e293b]/10 border-l-[3px] border-l-[#1e293b] dark:bg-slate-700/40 dark:border-l-slate-400"
          : "hover:bg-slate-50 border-l-[3px] border-l-transparent dark:hover:bg-slate-800/60"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar
            fullName={convo.other_user_name}
            avatarUrl={avatarUrl}
            size="sm"
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`truncate text-sm ${
                convo.is_unread ? "font-semibold text-[#1e293b] dark:text-slate-100" : "font-medium text-slate-700 dark:text-slate-300"
              }`}
            >
              {convo.other_user_name}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {convo.last_message_at && (
                <span className={`text-[11px] ${convo.is_unread ? "text-[#1e293b] font-medium dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`}>
                  {formatTimestamp(convo.last_message_at)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p
              className={`text-xs truncate flex-1 ${
                convo.is_unread ? "font-medium text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {convo.last_message_content ||
                (convo.last_message_at ? "Attachment" : "No messages yet")}
            </p>
            {convo.is_unread && convo.unread_count > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[#1e293b] dark:bg-slate-200 dark:text-slate-900 rounded-full">
                {convo.unread_count > 99 ? "99+" : convo.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({
  msg,
  isOwn,
  selectedConvo,
  avatarUrl,
  editingMessageId,
  editContent,
  setEditContent,
  startEdit,
  cancelEdit,
  saveEdit,
  handleDelete,
  formatMessageTime,
  getTickStatus,
  handleMediaLoad,
}: {
  msg: Message;
  isOwn: boolean;
  selectedConvo: Conversation | undefined;
  avatarUrl: string | null;
  editingMessageId: string | null;
  editContent: string;
  setEditContent: (v: string) => void;
  startEdit: (msg: Message) => void;
  cancelEdit: () => void;
  saveEdit: (id: string) => void;
  handleDelete: (id: string) => void;
  formatMessageTime: (d: string) => string;
  getTickStatus: (msg: Message) => "sent" | "delivered" | "read";
  handleMediaLoad: () => void;
}) {
  return (
    <div className={`group flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      {/* Avatar for incoming messages */}
      {!isOwn && selectedConvo && (
        <Avatar
          fullName={selectedConvo.other_user_name}
          avatarUrl={avatarUrl}
          size="sm"
          className="mb-1"
        />
      )}

      {/* Edit/Delete actions for own messages (show on hover) */}
      {isOwn && editingMessageId !== msg.id && (
        <div className="hidden group-hover:flex items-center gap-1 mr-1">
          <button
            onClick={() => startEdit(msg)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
            title="Edit"
          >
            &#9998;
          </button>
          <button
            onClick={() => handleDelete(msg.id)}
            className="text-slate-400 hover:text-red-500 p-1 rounded"
            title="Delete"
          >
            &#128465;
          </button>
        </div>
      )}

      <div
        className={`max-w-[70%] px-4 py-2.5 ${
          isOwn
            ? "bg-[#1e293b] text-white rounded-2xl rounded-br-md dark:bg-slate-700"
            : "bg-slate-100 text-slate-900 rounded-2xl rounded-bl-md dark:bg-slate-800 dark:text-slate-100"
        }`}
      >
        {/* Inline edit mode */}
        {editingMessageId === msg.id ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full rounded-lg p-2 text-slate-900 dark:text-slate-100 text-sm resize-none border border-slate-200 dark:border-slate-600 dark:bg-slate-900 focus:outline-none focus:border-[#1e293b] dark:focus:border-slate-400"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-1.5 justify-end">
              <button
                onClick={cancelEdit}
                className="text-xs px-3 py-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveEdit(msg.id)}
                disabled={!editContent.trim()}
                className="text-xs px-3 py-1 rounded-lg bg-white text-[#1e293b] font-medium hover:bg-slate-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            {msg.content && (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {msg.content}
              </p>
            )}
            {msg.attachments?.map((att) => (
              <div key={att.id} className="mt-2">
                {att.type === "image" && att.signedUrl && (
                  <img
                    src={att.signedUrl}
                    alt="attachment"
                    className="max-w-full rounded-lg"
                    style={{ maxWidth: 300 }}
                    onLoad={handleMediaLoad}
                  />
                )}
                {att.type === "video" && att.signedUrl && (
                  <video
                    src={att.signedUrl}
                    controls
                    className="max-w-full rounded-lg"
                    style={{ maxWidth: 300, maxHeight: 200 }}
                    onLoadedMetadata={handleMediaLoad}
                  />
                )}
              </div>
            ))}
          </>
        )}
        <p
          className={`text-[11px] mt-1 flex items-center gap-1 ${
            isOwn ? "text-slate-400 justify-end" : "text-slate-400"
          }`}
        >
          {formatMessageTime(msg.created_at)}
          {msg.updated_at && (
            <span className="opacity-70" title="Edited">(edited)</span>
          )}
          {isOwn && (() => {
            const tick = getTickStatus(msg);
            if (tick === "read")
              return <span className="text-emerald-400" title="Read">{"✓✓"}</span>;
            if (tick === "delivered")
              return <span className="opacity-70" title="Delivered">{"✓✓"}</span>;
            return <span className="opacity-70" title="Sent">{"✓"}</span>;
          })()}
        </p>
      </div>

      {/* Avatar for own messages */}
      {isOwn && selectedConvo && (
        <div className="w-8 shrink-0" />
      )}
    </div>
  );
}

function Composer({
  messageInput,
  setMessageInput,
  sending,
  selectedFile,
  fileError,
  fileInputRef,
  handleSend,
  handleFileSelect,
  clearSelectedFile,
  formatFileSize,
}: {
  messageInput: string;
  setMessageInput: (v: string) => void;
  sending: boolean;
  selectedFile: File | null;
  fileError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleSend: (e: React.FormEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearSelectedFile: () => void;
  formatFileSize: (b: number) => string;
}) {
  return (
    <div className="p-4 border-t border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
      {selectedFile && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm border border-slate-200 dark:border-slate-700">
          <span className="truncate flex-1 text-slate-600 dark:text-slate-300">
            {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </span>
          <button
            type="button"
            onClick={clearSelectedFile}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            &times;
          </button>
        </div>
      )}
      {fileError && (
        <p className="text-red-500 text-xs mb-2 px-1">{fileError}</p>
      )}
      <form onSubmit={handleSend} className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-[#1e293b] hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          title="Attach file"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="10" y1="4" x2="10" y2="16" />
            <line x1="4" y1="10" x2="16" y2="10" />
          </svg>
        </button>
        <div className="flex-1 relative">
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if ((messageInput.trim() || selectedFile) && !sending) {
                  handleSend(e);
                }
              }
            }}
            placeholder="Type a message..."
            className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 pr-12 resize-none text-sm focus:outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]/20 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400/20 transition-colors placeholder:text-slate-400"
            rows={1}
            disabled={sending}
          />
        </div>
        <button
          type="submit"
          disabled={(!messageInput.trim() && !selectedFile) || sending}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1e293b] text-white hover:bg-[#334155] dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 text-center">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
}

/* ── Main component ── */

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams.get("c");
  const { refreshMetrics } = useAppMetrics();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const lastAutoScrollMessageIdRef = useRef<string | null>(null);
  const lastMarkedRef = useRef<string | null>(null);

  // Ticket 30: edit/delete state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const editingMessageIdRef = useRef<string | null>(null);

  // Ticket 29: delivery upsert guard + tick state
  const lastDeliveryMsgIdRef = useRef<string | null>(null);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const [otherLastDeliveredAt, setOtherLastDeliveredAt] = useState<string | null>(null);

  // Ticket 29.1: auto-read guards for incoming messages while conversation is open
  const lastAutoReadMsgIdRef = useRef<string | null>(null);
  const lastAutoReadTimeRef = useRef<number>(0);
  const AUTO_READ_COOLDOWN = 5000; // 5 seconds

  // Ticket 38.1: avatar signed URL resolution (cached per page session)
  const { resolveAvatarUrls } = useAvatarUrls();
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  // Ticket 53: online presence for conversation partners
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());

  // Ref to track currently-open conversation for use inside stable callbacks
  const conversationIdRef = useRef<string | null>(conversationId);
  conversationIdRef.current = conversationId;

  // Polling refs to prevent unnecessary state updates
  const isVisibleRef = useRef(true);
  const lastConvosJsonRef = useRef<string>("");
  const lastMessagesJsonRef = useRef<string>("");
  const lastMessageIdRef = useRef<string | null>(null);

  // Mark conversation as read (with guard to prevent duplicate calls)
  async function markConversationAsRead(convId: string) {
    // Guard: skip if we already marked this conversation as read
    if (lastMarkedRef.current === convId) return;
    if (!currentUserId) return;

    // Upsert conversation_reads row
    const { error } = await supabase
      .from("conversation_reads")
      .upsert(
        {
          conversation_id: convId,
          user_id: currentUserId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id,user_id" }
      );

    if (error) {
      console.error("Error marking conversation as read:", error.message);
      return;
    }

    // Mark this conversation as processed to prevent re-runs
    lastMarkedRef.current = convId;

    // Refresh shared metrics so sidebar badge updates
    refreshMetrics();

    // Update local state to reflect read status
    setConversations((prev) =>
      prev.map((c) =>
        c.conversation_id === convId
          ? { ...c, is_unread: false, unread_count: 0 }
          : c
      )
    );
  }

  // Ticket 29: Upsert delivery row (guarded by newest message id)
  async function upsertDelivery(convId: string, newestMsgId: string | null) {
    if (!currentUserId || !newestMsgId) return;
    if (lastDeliveryMsgIdRef.current === newestMsgId) return;
    lastDeliveryMsgIdRef.current = newestMsgId;

    await supabase
      .from("conversation_deliveries")
      .upsert(
        {
          conversation_id: convId,
          user_id: currentUserId,
          last_delivered_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id,user_id" }
      );
  }

  // Ticket 29 / 29.1: Fetch other user's read + delivery timestamps for ticks
  const fetchTickState = useCallback(async (convId: string, otherUserId: string) => {
    const [readRes, deliveryRes] = await Promise.all([
      supabase.rpc("get_conversation_read_state", { conv_id: convId }),
      supabase
        .from("conversation_deliveries")
        .select("last_delivered_at")
        .eq("conversation_id", convId)
        .eq("user_id", otherUserId)
        .maybeSingle(),
    ]);

    if (readRes.data && readRes.data.length > 0) {
      setOtherLastReadAt(readRes.data[0].other_last_read_at ?? null);
    }
    setOtherLastDeliveredAt(deliveryRes.data?.last_delivered_at ?? null);
  }, []);

  // Fetch conversations (reusable for initial load + polling)
  const fetchConversations = useCallback(async (isInitial = false) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      if (isInitial) setLoadingConvos(false);
      return;
    }
    if (isInitial) setCurrentUserId(session.user.id);

    const { data, error } = await supabase.rpc("get_my_conversations");
    if (error) {
      console.error("Error fetching conversations:", error.message);
    } else {
      // Only update state if data has changed (shallow compare JSON)
      const newJson = JSON.stringify(data || []);
      if (newJson !== lastConvosJsonRef.current) {
        lastConvosJsonRef.current = newJson;
        // Ticket 29.1: preserve is_unread=false for the currently-open conversation
        // Server data may be stale (race between read upsert and poll)
        const openId = conversationIdRef.current;
        const patched = (data || []).map((c: Conversation) =>
          c.conversation_id === openId
            ? { ...c, is_unread: false, unread_count: 0 }
            : c
        );
        setConversations(patched);
      }
    }
    if (isInitial) setLoadingConvos(false);
  }, []);

  // Initial fetch of conversations
  useEffect(() => {
    fetchConversations(true);
  }, [fetchConversations]);

  // Ticket 38.1: resolve signed avatar URLs whenever conversation list changes
  useEffect(() => {
    if (conversations.length === 0) return;
    const profiles = conversations
      .filter((c) => c.other_user_avatar_path)
      .map((c) => ({ id: c.other_user_id, avatar_path: c.other_user_avatar_path }));
    if (profiles.length === 0) return;
    resolveAvatarUrls(profiles as { id: string; avatar_path: string }[]).then(
      setAvatarUrls
    );
  }, [conversations, resolveAvatarUrls]);

  // Ticket 53: fetch presence for conversation partners
  useEffect(() => {
    if (conversations.length === 0) return;
    const ids = conversations.map((c) => c.other_user_id);
    supabase
      .from("presence")
      .select("user_id, last_seen_at")
      .in("user_id", ids)
      .then(({ data }) => {
        if (!data) return;
        const now = Date.now();
        const online = new Set<string>();
        for (const row of data) {
          if (now - new Date(row.last_seen_at).getTime() <= ONLINE_THRESHOLD_MS) {
            online.add(row.user_id);
          }
        }
        setOnlineSet(online);
      });
  }, [conversations]);

  // Fetch messages (reusable for initial load + polling)
  const fetchMessages = useCallback(async (convId: string, isInitial = false) => {
    if (isInitial) {
      setLoadingMessages(true);
      setThreadError(null);
    }

    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at, updated_at, message_attachments(id, type, storage_path, mime_type)")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      if (isInitial) {
        if (error.code === "PGRST116" || error.message.includes("RLS")) {
          setThreadError("Conversation not found or not authorized");
        } else {
          setThreadError("Failed to load messages");
        }
        console.error("Error fetching messages:", error.message);
        setMessages([]);
        setLoadingMessages(false);
      }
      return;
    }

    // For polling: check if the latest message ID changed before full processing
    const latestMsgId = data && data.length > 0 ? data[data.length - 1].id : null;
    if (!isInitial && latestMsgId === lastMessageIdRef.current) {
      // No new messages, skip processing
      return;
    }

    // Check if we got results - if empty, verify we have access (only on initial load)
    if (isInitial && data.length === 0) {
      // Verify conversation exists by checking conversations list
      const { data: convCheck } = await supabase.rpc("get_my_conversations");
      const hasAccess = (convCheck || []).some(
        (c: Conversation) => c.conversation_id === convId
      );
      if (!hasAccess) {
        setThreadError("Conversation not found or not authorized");
      }
    }

    // Fetch signed URLs for attachments
    const messagesWithUrls = await Promise.all(
      (data || []).map(async (msg) => {
        const rawAttachments = msg.message_attachments as Attachment[] | null;
        if (!rawAttachments || rawAttachments.length === 0) {
          return { ...msg, attachments: [] };
        }
        const attachmentsWithUrls = await Promise.all(
          rawAttachments.map(async (att) => {
            const { data: urlData } = await supabase.storage
              .from("message-media")
              .createSignedUrl(att.storage_path, 3600);
            return { ...att, signedUrl: urlData?.signedUrl };
          })
        );
        return { ...msg, attachments: attachmentsWithUrls };
      })
    );

    // Only update if data changed (compare without signedUrls which change each time)
    const newJson = JSON.stringify(messagesWithUrls.map(m => ({ id: m.id, content: m.content, created_at: m.created_at, updated_at: m.updated_at })));
    if (newJson !== lastMessagesJsonRef.current) {
      lastMessagesJsonRef.current = newJson;
      lastMessageIdRef.current = latestMsgId;
      // Ticket 30: skip poll update while user is editing a message to prevent flicker
      if (!editingMessageIdRef.current) {
        setMessages(messagesWithUrls);
      }
    }

    // Ticket 29: upsert delivery when we fetch/poll messages
    if (latestMsgId) {
      upsertDelivery(convId, latestMsgId);
    }

    // Ticket 29.1: auto-mark-as-read when conversation is open and new incoming message arrives
    if (!isInitial && currentUserId) {
      const latestIncoming = [...messagesWithUrls].reverse().find(m => m.sender_id !== currentUserId);
      if (
        latestIncoming &&
        latestIncoming.id !== lastAutoReadMsgIdRef.current &&
        Date.now() - lastAutoReadTimeRef.current >= AUTO_READ_COOLDOWN
      ) {
        lastAutoReadMsgIdRef.current = latestIncoming.id;
        lastAutoReadTimeRef.current = Date.now();
        lastMarkedRef.current = null; // Reset so markConversationAsRead proceeds
        markConversationAsRead(convId);
      }
    }

    if (isInitial) setLoadingMessages(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch messages when conversation changes and mark as read
  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setMessages([]);
      setThreadError(null);
      setOtherLastReadAt(null);
      setOtherLastDeliveredAt(null);
      lastMessagesJsonRef.current = "";
      lastMessageIdRef.current = null;
      lastDeliveryMsgIdRef.current = null;
      lastAutoReadMsgIdRef.current = null;
      lastAutoReadTimeRef.current = 0;
      return;
    }

    // Mark conversation as read when opened
    markConversationAsRead(conversationId);

    fetchMessages(conversationId, true);

    // Ticket 29: fetch tick state for this conversation
    const otherUserId = conversations.find(c => c.conversation_id === conversationId)?.other_user_id;
    if (otherUserId) fetchTickState(conversationId, otherUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId, fetchMessages]);

  // Visibility change detection for polling pause/resume
  useEffect(() => {
    function handleVisibilityChange() {
      isVisibleRef.current = document.visibilityState === "visible";
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Poll conversations every 6 seconds
  useEffect(() => {
    if (!currentUserId) return;

    const intervalId = setInterval(() => {
      if (isVisibleRef.current) {
        fetchConversations(false);
      }
    }, CONVERSATION_POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [currentUserId, fetchConversations]);

  // Poll messages every 3 seconds when a conversation is selected
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const otherUserId = conversations.find(c => c.conversation_id === conversationId)?.other_user_id;

    const intervalId = setInterval(() => {
      if (isVisibleRef.current) {
        fetchMessages(conversationId, false);
        // Ticket 29: poll tick state alongside messages
        if (otherUserId) fetchTickState(conversationId, otherUserId);
      }
    }, MESSAGES_POLL_INTERVAL);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId, fetchMessages]);

  // --- Ticket 31: WhatsApp-style scroll helpers ---
  function isNearBottom(container: HTMLElement, threshold = 120): boolean {
    return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
  }

  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    }
  }

  // Ticket 31: On conversation switch, force scroll to bottom after layout settles
  useEffect(() => {
    if (!conversationId) return;
    // Reset scroll tracking for new conversation
    userScrolledUpRef.current = false;
    lastAutoScrollMessageIdRef.current = null;

    // Double rAF ensures images/layout have settled before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
    });
  }, [conversationId]);

  // Ticket 31: Smart scroll on message changes (polling / new messages)
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];

    // On first load for this conversation, always scroll to bottom
    if (lastAutoScrollMessageIdRef.current === null) {
      lastAutoScrollMessageIdRef.current = lastMsg.id;
      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
      return;
    }

    // New message arrived
    if (lastMsg.id !== lastAutoScrollMessageIdRef.current) {
      lastAutoScrollMessageIdRef.current = lastMsg.id;
      if (!userScrolledUpRef.current) {
        scrollToBottom("smooth");
      }
    }
  }, [messages]);

  // Ticket 31: Track scroll position
  function handleContainerScroll() {
    const container = messagesContainerRef.current;
    if (container) {
      userScrolledUpRef.current = !isNearBottom(container);
    }
  }

  // Ticket 31: Media load handler — keep pinned to bottom if user is near bottom
  function handleMediaLoad() {
    const container = messagesContainerRef.current;
    if (container && !userScrolledUpRef.current) {
      scrollToBottom("auto");
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      setFileError("Only images (jpeg/png/webp/gif) and videos (mp4/webm) are allowed.");
      return;
    }
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      setFileError("Image must be 5MB or smaller.");
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      setFileError("Video must be 35MB or smaller.");
      return;
    }
    setSelectedFile(file);
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = messageInput.trim() || null;
    if ((!content && !selectedFile) || !conversationId || !currentUserId || sending) return;

    setSending(true);
    setFileError(null);

    // 1. Insert message first
    const { data: msgData, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
      })
      .select("id, sender_id, content, created_at, updated_at")
      .single();

    if (msgError) {
      console.error("Error sending message:", msgError.message);
      if (msgError.message.includes("RLS") || msgError.code === "42501") {
        setThreadError("Not authorized to send messages in this conversation");
      } else {
        alert("Failed to send message");
      }
      setSending(false);
      return;
    }

    let attachments: Attachment[] = [];

    // 2. Upload file if selected
    if (selectedFile && msgData) {
      const isImage = ACCEPTED_IMAGE_TYPES.includes(selectedFile.type);
      const fileExt = selectedFile.name.split(".").pop() || "bin";
      const uuid = crypto.randomUUID();
      const storagePath = `messages/${conversationId}/${msgData.id}/${uuid}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("message-media")
        .upload(storagePath, selectedFile, { contentType: selectedFile.type });

      if (uploadError) {
        console.error("Error uploading file:", uploadError.message);
        setFileError("Failed to upload attachment. Message sent without it.");
      } else {
        // 3. Insert attachment record
        const { data: attData, error: attError } = await supabase
          .from("message_attachments")
          .insert({
            message_id: msgData.id,
            type: isImage ? "image" : "video",
            storage_path: storagePath,
            mime_type: selectedFile.type,
            size_bytes: selectedFile.size,
          })
          .select("id, type, storage_path, mime_type")
          .single();

        if (attError) {
          console.error("Error saving attachment record:", attError.message);
          setFileError("Failed to save attachment record.");
        } else if (attData) {
          const { data: urlData } = await supabase.storage
            .from("message-media")
            .createSignedUrl(storagePath, 3600);
          attachments = [{ ...attData, signedUrl: urlData?.signedUrl } as Attachment];
        }
      }
    }

    if (msgData) {
      setMessages((prev) => [...prev, { ...msgData, attachments }]);
      setMessageInput("");
      clearSelectedFile();
      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conversationId
            ? {
                ...c,
                last_message_content: content || "(attachment)",
                last_message_at: msgData.created_at,
              }
            : c
        )
      );
    }
    setSending(false);
  }

  // Ticket 30: Start editing a message
  function startEdit(msg: Message) {
    setEditingMessageId(msg.id);
    editingMessageIdRef.current = msg.id;
    setEditContent(msg.content || "");
  }

  function cancelEdit() {
    setEditingMessageId(null);
    editingMessageIdRef.current = null;
    setEditContent("");
  }

  async function saveEdit(msgId: string) {
    const trimmed = editContent.trim();
    if (!trimmed) return;

    const { error } = await supabase
      .from("messages")
      .update({ content: trimmed, updated_at: new Date().toISOString() })
      .eq("id", msgId);

    if (error) {
      console.error("Error updating message:", error.message);
      alert("Failed to update message");
      return;
    }

    // Update local state
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, content: trimmed, updated_at: new Date().toISOString() }
          : m
      )
    );
    // Clear stale poll cache so next poll picks up edited content
    lastMessagesJsonRef.current = "";
    cancelEdit();
  }

  async function handleDelete(msgId: string) {
    if (!confirm("Delete this message?")) return;

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", msgId);

    if (error) {
      console.error("Error deleting message:", error.message);
      alert("Failed to delete message");
      return;
    }

    // Remove from local state
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    // Clear stale poll cache
    lastMessagesJsonRef.current = "";
    lastMessageIdRef.current = null;
  }

  function selectConversation(convId: string) {
    router.push(`/app/messages?c=${convId}`);
  }

  // Format timestamp for conversation list (WhatsApp-style: time for today, "Yesterday", or date)
  function formatConversationTimestamp(dateStr: string | null): string {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();

    // Check if same calendar day (today)
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return "Yesterday";
    }

    // Older dates: show "Jan 31, 2026"
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  }

  // Format time for message bubbles (h:mm AM/PM)
  function formatMessageTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  // Day separator helpers
  function getLocalDateKey(ts: string): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatDayLabel(ts: string): string {
    const date = new Date(ts);
    const now = new Date();

    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (isToday) return "Today";

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();
    if (isYesterday) return "Yesterday";

    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  }

  // Ticket 29: determine tick status for own messages
  function getTickStatus(msg: Message): "sent" | "delivered" | "read" {
    if (msg.sender_id !== currentUserId) return "sent";
    if (otherLastReadAt && msg.created_at <= otherLastReadAt) return "read";
    if (otherLastDeliveredAt && msg.created_at <= otherLastDeliveredAt) return "delivered";
    return "sent";
  }

  const selectedConvo = conversations.find(
    (c) => c.conversation_id === conversationId
  );

  if (loadingConvos) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeLinecap="round" />
          </svg>
          <span className="text-sm">Loading conversations...</span>
        </div>
      </div>
    );
  }

  if (!currentUserId) {
    return <p className="text-slate-500">Please sign in to view messages.</p>;
  }

  return (
    <div className="app-card flex h-[calc(100vh-200px)] min-h-[400px] overflow-hidden">
      {/* Left pane: Conversation list */}
      <div className="w-[340px] min-w-[280px] border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-900">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-[#1e293b] dark:text-slate-100">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-slate-400 text-sm">No conversations yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {conversations.map((convo) => (
                <ConversationItem
                  key={convo.conversation_id}
                  convo={convo}
                  isActive={convo.conversation_id === conversationId}
                  avatarUrl={avatarUrls[convo.other_user_id] ?? null}
                  isOnline={onlineSet.has(convo.other_user_id)}
                  onClick={() => selectConversation(convo.conversation_id)}
                  formatTimestamp={formatConversationTimestamp}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right pane: Thread */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
        {!conversationId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 dark:text-slate-600">
              <path d="M8 36V12a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H16l-8 8Z" />
              <line x1="16" y1="18" x2="32" y2="18" />
              <line x1="16" y1="24" x2="26" y2="24" />
            </svg>
            <p className="text-sm">Select a conversation to start messaging</p>
          </div>
        ) : threadError ? (
          <div className="flex-1 flex items-center justify-center text-red-500 text-sm">
            {threadError}
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-3">
              {selectedConvo && (
                <>
                  <div className="relative">
                    <Avatar
                      fullName={selectedConvo.other_user_name}
                      avatarUrl={avatarUrls[selectedConvo.other_user_id] ?? null}
                      size="sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1e293b] dark:text-slate-100 text-sm truncate">
                      {selectedConvo.other_user_name}
                    </p>
                  </div>
                  {onlineSet.has(selectedConvo.other_user_id) && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      Online
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleContainerScroll}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50"
            >
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-3 text-slate-400">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeLinecap="round" />
                    </svg>
                    <span className="text-sm">Loading messages...</span>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-400 text-sm">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                (() => {
                  let lastDateKey = "";
                  return messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId;
                    const dateKey = getLocalDateKey(msg.created_at);
                    const showSeparator = dateKey !== lastDateKey;
                    if (showSeparator) lastDateKey = dateKey;
                    return (
                      <div key={msg.id}>
                        {showSeparator && (
                          <div className="flex items-center justify-center my-4">
                            <span className="px-3 py-1 text-[11px] font-medium text-slate-500 bg-white rounded-full shadow-sm border border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                              {formatDayLabel(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <MessageBubble
                          msg={msg}
                          isOwn={isOwn}
                          selectedConvo={selectedConvo}
                          avatarUrl={avatarUrls[selectedConvo?.other_user_id ?? ""] ?? null}
                          editingMessageId={editingMessageId}
                          editContent={editContent}
                          setEditContent={setEditContent}
                          startEdit={startEdit}
                          cancelEdit={cancelEdit}
                          saveEdit={saveEdit}
                          handleDelete={handleDelete}
                          formatMessageTime={formatMessageTime}
                          getTickStatus={getTickStatus}
                          handleMediaLoad={handleMediaLoad}
                        />
                      </div>
                    );
                  });
                })()
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <Composer
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              sending={sending}
              selectedFile={selectedFile}
              fileError={fileError}
              fileInputRef={fileInputRef}
              handleSend={handleSend}
              handleFileSelect={handleFileSelect}
              clearSelectedFile={clearSelectedFile}
              formatFileSize={formatFileSize}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mb-6">
        <Link href="/app" className="text-[#1e293b] hover:text-[#334155] dark:text-slate-300 dark:hover:text-white text-sm font-medium transition-colors">
          &larr; Back to App
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-[#1e293b] dark:text-slate-100 mb-6">Messages</h1>

      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      }>
        <MessagesContent />
      </Suspense>
    </main>
  );
}
