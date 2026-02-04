"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";

interface Conversation {
  conversation_id: string;
  other_user_id: string;
  other_user_name: string;
  last_message_content: string | null;
  last_message_at: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
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
        .select("id, sender_id, content, created_at")
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
        setMessages(data || []);
      }
      setLoadingMessages(false);
    }

    fetchMessages();
  }, [conversationId, currentUserId, conversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = messageInput.trim();
    if (!content || !conversationId || !currentUserId || sending) return;

    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
      })
      .select("id, sender_id, content, created_at")
      .single();

    if (error) {
      console.error("Error sending message:", error.message);
      if (error.message.includes("RLS") || error.code === "42501") {
        setThreadError("Not authorized to send messages in this conversation");
      } else {
        alert("Failed to send message");
      }
    } else if (data) {
      setMessages((prev) => [...prev, data]);
      setMessageInput("");
      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conversationId
            ? {
                ...c,
                last_message_content: content,
                last_message_at: data.created_at,
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
                        {convo.last_message_content || "No messages yet"}
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
                        <p className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
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
            <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
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
                disabled={!messageInput.trim() || sending}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "..." : "Send"}
              </button>
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
