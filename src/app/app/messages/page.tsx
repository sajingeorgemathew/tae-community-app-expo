"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 35 * 1024 * 1024; // 35MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"];

interface Conversation {
  conversation_id: string;
  other_user_id: string;
  other_user_name: string;
  last_message_content: string | null;
  last_message_at: string | null;
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
  attachments?: Attachment[];
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams.get("c");

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

  // Fetch current user and conversations
  useEffect(() => {
    async function fetchConversations() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoadingConvos(false);
        return;
      }
      setCurrentUserId(session.user.id);

      const { data, error } = await supabase.rpc("get_my_conversations");
      if (error) {
        console.error("Error fetching conversations:", error.message);
      } else {
        setConversations(data || []);
      }
      setLoadingConvos(false);
    }

    fetchConversations();
  }, []);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setMessages([]);
      setThreadError(null);
      return;
    }

    async function fetchMessages() {
      setLoadingMessages(true);
      setThreadError(null);

      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at, message_attachments(id, type, storage_path, mime_type)")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        if (error.code === "PGRST116" || error.message.includes("RLS")) {
          setThreadError("Conversation not found or not authorized");
        } else {
          setThreadError("Failed to load messages");
        }
        console.error("Error fetching messages:", error.message);
        setMessages([]);
      } else {
        // Check if we got results - if empty, verify we have access
        if (data.length === 0) {
          // Verify conversation exists and we're a member by checking our conversations list
          const hasAccess = conversations.some(
            (c) => c.conversation_id === conversationId
          );
          if (!hasAccess && conversations.length > 0) {
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
        setMessages(messagesWithUrls);
      }
      setLoadingMessages(false);
    }

    fetchMessages();
  }, [conversationId, currentUserId, conversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      .select("id, sender_id, content, created_at")
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

  function selectConversation(convId: string) {
    router.push(`/app/messages?c=${convId}`);
  }

  function formatTime(dateStr: string | null) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
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
                    <p className="font-medium truncate">
                      {convo.other_user_name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500 truncate flex-1">
                        {convo.last_message_content ||
                          (convo.last_message_at ? "📎 Attachment" : "No messages yet")}
                      </p>
                      {convo.last_message_at && (
                        <span className="text-xs text-gray-400 ml-2">
                          {formatTime(convo.last_message_at)}
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
            {/* Thread header */}
            <div className="p-3 border-b bg-gray-50 font-medium">
              {selectedConvo?.other_user_name || "Conversation"}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <p className="text-gray-500">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-gray-500 text-center">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isOwn
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-900"
                        }`}
                      >
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
                              />
                            )}
                            {att.type === "video" && att.signedUrl && (
                              <video
                                src={att.signedUrl}
                                controls
                                className="max-w-full rounded"
                                style={{ maxWidth: 300, maxHeight: 200 }}
                              />
                            )}
                          </div>
                        ))}
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? "text-blue-200" : "text-gray-500"
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
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
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border rounded px-3 py-2"
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
