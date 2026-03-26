import { PRESENCE_ONLINE_THRESHOLD_MS } from "@tae/shared";
import { supabase } from "./supabase";
import type { FeedPost } from "./posts";
import { fetchFeedPosts } from "./posts";

// ---------------------------------------------------------------------------
// Dashboard data types
// ---------------------------------------------------------------------------

export interface DashboardData {
  unreadMessages: number;
  questionsCount: number;
  /** null = could not determine; display placeholder */
  onlineMembers: number | null;
  recentPosts: FeedPost[];
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

const RECENT_POSTS_LIMIT = 3;

async function fetchUnreadMessagesCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("get_my_conversations");
    if (error || !data) return 0;
    const conversations = data as { is_unread?: boolean; unread_count?: number }[];
    return conversations.reduce(
      (sum, c) => sum + (c.unread_count ?? (c.is_unread ? 1 : 0)),
      0,
    );
  } catch {
    return 0;
  }
}

async function fetchQuestionsActivityCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true });
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function fetchOnlineMembersCount(): Promise<number | null> {
  try {
    const threshold = new Date(Date.now() - PRESENCE_ONLINE_THRESHOLD_MS).toISOString();
    const { count, error } = await supabase
      .from("presence")
      .select("user_id", { count: "exact", head: true })
      .gte("last_seen_at", threshold);
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

async function fetchRecentPosts(): Promise<FeedPost[]> {
  try {
    const posts = await fetchFeedPosts();
    return posts.slice(0, RECENT_POSTS_LIMIT);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main dashboard fetch
// ---------------------------------------------------------------------------

export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const [unreadMessages, questionsCount, onlineMembers, recentPosts] =
    await Promise.all([
      fetchUnreadMessagesCount(userId),
      fetchQuestionsActivityCount(),
      fetchOnlineMembersCount(),
      fetchRecentPosts(),
    ]);

  return {
    unreadMessages,
    questionsCount,
    onlineMembers,
    recentPosts,
  };
}
