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
    return <p className="text-gray-500">Loading...</p>;
  }

  if (!currentUserId) {
    return <p className="text-gray-500">Please sign in to view messages.</p>;
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[400px] border rounded overflow-hidden">
      {/* Left pane: Conversation list */}
      <div className="w-1/3 min-w-[200px] max-w-[300px] border-r flex flex-col">
        <div className="p-3 border-b bg-gray-50 font-medium">Conversations</div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">No conversations yet.</p>
          ) : (
            <ul>
              {conversations.map((convo) => (
                <li key={convo.conversation_id}>
                  <button
                    onClick={() => selectConversation(convo.conversation_id)}
                    className={`w-full text-left p-3 border-b hover:bg-gray-50 transition-colors ${
                      convo.conversation_id === conversationId
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar
                          fullName={convo.other_user_name}
                          avatarUrl={avatarUrls[convo.other_user_id] ?? null}
                          size="sm"
                        />
                        {onlineSet.has(convo.other_user_id) && (
                          <span
                            className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
                            title="Online"
                          />
                        )}
                      </div>
                      {convo.is_unread && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                      )}
                      <p className={`truncate flex-1 ${convo.is_unread ? "font-bold" : "font-medium"}`}>
                        {convo.other_user_name}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-sm truncate flex-1 ${convo.is_unread ? "font-semibold text-gray-700" : "text-gray-500"}`}>
                        {convo.last_message_content ||
                          (convo.last_message_at ? "📎 Attachment" : "No messages yet")}
                      </p>
                      {convo.last_message_at && (
                        <span className="text-xs text-gray-400 ml-2">
                          {formatConversationTimestamp(convo.last_message_at)}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right pane: Thread */}
      <div className="flex-1 flex flex-col">
        {!conversationId ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        ) : threadError ? (
          <div className="flex-1 flex items-center justify-center text-red-500">
            {threadError}
          </div>
        ) : (
          <>
            {/* Thread header — Ticket 38.2: avatar + name */}
            <div className="p-3 border-b bg-gray-50 font-medium flex items-center gap-2">
              {selectedConvo && (
                <div className="relative">
                  <Avatar
                    fullName={selectedConvo.other_user_name}
                    avatarUrl={avatarUrls[selectedConvo.other_user_id] ?? null}
                    size="sm"
                  />
                  {onlineSet.has(selectedConvo.other_user_id) && (
                    <span
                      className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
                      title="Online"
                    />
                  )}
                </div>
              )}
              {selectedConvo?.other_user_name || "Conversation"}
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} onScroll={handleContainerScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <p className="text-gray-500">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-gray-500 text-center">
                  No messages yet. Start the conversation!
                </p>
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
                          <div className="flex items-center justify-center my-3">
                            <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-full">
                              {formatDayLabel(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`group flex items-end gap-1 ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          {/* Ticket 38.2: avatar next to incoming messages */}
                          {!isOwn && selectedConvo && (
                            <Avatar
                              fullName={selectedConvo.other_user_name}
                              avatarUrl={avatarUrls[selectedConvo.other_user_id] ?? null}
                              size="sm"
                              className="mb-1"
                            />
                          )}
                          {/* Ticket 30: Edit/Delete actions for own messages (show on hover) */}
                          {isOwn && editingMessageId !== msg.id && (
                            <div className="hidden group-hover:flex items-center gap-1 mr-1">
                              <button
                                onClick={() => startEdit(msg)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded"
                                title="Edit"
                              >
                                &#9998;
                              </button>
                              <button
                                onClick={() => handleDelete(msg.id)}
                                className="text-gray-400 hover:text-red-500 p-1 rounded"
                                title="Delete"
                              >
                                &#128465;
                              </button>
                            </div>
                          )}
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isOwn
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-900"
                            }`}
                          >
                            {/* Ticket 30: Inline edit mode */}
                            {editingMessageId === msg.id ? (
                              <div>
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full rounded p-1 text-gray-900 text-sm resize-none"
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex gap-2 mt-1 justify-end">
                                  <button
                                    onClick={cancelEdit}
                                    className="text-xs px-2 py-1 rounded bg-gray-300 text-gray-700 hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => saveEdit(msg.id)}
                                    disabled={!editContent.trim()}
                                    className="text-xs px-2 py-1 rounded bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {msg.content && (
                                  <p className="whitespace-pre-wrap break-words">
                                    {msg.content}
                                  </p>
                                )}
                                {msg.attachments?.map((att) => (
                                  <div key={att.id} className="mt-2">
                                    {att.type === "image" && att.signedUrl && (
                                      <img
                                        src={att.signedUrl}
                                        alt="attachment"
                                        className="max-w-full rounded"
                                        style={{ maxWidth: 300 }}
                                        onLoad={handleMediaLoad}
                                      />
                                    )}
                                    {att.type === "video" && att.signedUrl && (
                                      <video
                                        src={att.signedUrl}
                                        controls
                                        className="max-w-full rounded"
                                        style={{ maxWidth: 300, maxHeight: 200 }}
                                        onLoadedMetadata={handleMediaLoad}
                                      />
                                    )}
                                  </div>
                                ))}
                              </>
                            )}
                            <p
                              className={`text-xs mt-1 flex items-center gap-1 ${
                                isOwn ? "text-blue-200 justify-end" : "text-gray-500"
                              }`}
                            >
                              {formatMessageTime(msg.created_at)}
                              {msg.updated_at && (
                                <span className={isOwn ? "text-blue-200" : "text-gray-400"} title="Edited">(edited)</span>
                              )}
                              {isOwn && (() => {
                                const tick = getTickStatus(msg);
                                if (tick === "read")
                                  return <span className="text-blue-300" title="Read">{"✓✓"}</span>;
                                if (tick === "delivered")
                                  return <span className="opacity-70" title="Delivered">{"✓✓"}</span>;
                                return <span className="opacity-70" title="Sent">{"✓"}</span>;
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSend} className="p-3 border-t">
              {selectedFile && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 rounded text-sm">
                  <span className="truncate flex-1">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </span>
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    &times;
                  </button>
                </div>
              )}
              {fileError && (
                <p className="text-red-500 text-sm mb-2">{fileError}</p>
              )}
              <div className="flex gap-2">
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
                  className="border rounded px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
                  title="Attach file"
                >
                  +
                </button>
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
                  className="flex-1 border rounded px-3 py-2 resize-none"
                  rows={1}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={(!messageInput.trim() && !selectedFile) || sending}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
            </form>
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
        <Link href="/app" className="text-blue-600 hover:underline text-sm">
          &larr; Back to App
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-6">Messages</h1>

      <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
        <MessagesContent />
      </Suspense>
    </main>
  );
}
