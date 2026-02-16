"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

const POLL_INTERVAL_MS = 8000; // 8 seconds
const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

interface AppMetrics {
  unreadMessagesCount: number;
  qaActivityCount: number;
  onlineMembersCount: number;
  refreshMetrics: () => void;
}

const AppMetricsContext = createContext<AppMetrics>({
  unreadMessagesCount: 0,
  qaActivityCount: 0,
  onlineMembersCount: 0,
  refreshMetrics: () => {},
});

export function useAppMetrics() {
  return useContext(AppMetricsContext);
}

export function AppMetricsProvider({ children }: { children: React.ReactNode }) {
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [qaActivityCount, setQaActivityCount] = useState(0);
  const [onlineMembersCount, setOnlineMembersCount] = useState(0);

  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchMetrics = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || !mountedRef.current) {
        inFlightRef.current = false;
        return;
      }

      // Fire all metric fetches in parallel
      const [convosResult, readRowResult, presenceResult, profileResult] =
        await Promise.allSettled([
          supabase.rpc("get_my_conversations"),
          supabase
            .from("qa_activity_reads")
            .select("last_seen_at")
            .eq("user_id", session.user.id)
            .maybeSingle(),
          supabase.from("presence").select("user_id, last_seen_at"),
          supabase
            .from("profiles")
            .select("created_at")
            .eq("id", session.user.id)
            .single(),
        ]);

      if (!mountedRef.current) {
        inFlightRef.current = false;
        return;
      }

      // Unread messages
      if (convosResult.status === "fulfilled" && Array.isArray(convosResult.value.data)) {
        const total = convosResult.value.data.reduce(
          (sum: number, c: { unread_count?: number }) => sum + (c.unread_count ?? 0),
          0
        );
        setUnreadMessagesCount(total);
      }
      // else: keep previous count (safe fallback)

      // Q&A activity
      if (readRowResult.status === "fulfilled") {
        const profileCreatedAt =
          profileResult.status === "fulfilled"
            ? profileResult.value.data?.created_at
            : undefined;

        const lastSeen =
          readRowResult.value.data?.last_seen_at ??
          profileCreatedAt ??
          new Date().toISOString();

        const [qRes, aRes] = await Promise.all([
          supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .gt("created_at", lastSeen),
          supabase
            .from("answers")
            .select("id", { count: "exact", head: true })
            .gt("created_at", lastSeen),
        ]);

        if (mountedRef.current) {
          setQaActivityCount((qRes.count ?? 0) + (aRes.count ?? 0));
        }
      }

      // Online members
      if (presenceResult.status === "fulfilled" && presenceResult.value.data) {
        const now = Date.now();
        const count = presenceResult.value.data.filter(
          (r: { last_seen_at: string }) =>
            now - new Date(r.last_seen_at).getTime() <= ONLINE_THRESHOLD_MS
        ).length;
        setOnlineMembersCount(count);
      }
    } catch {
      // On unexpected error, keep previous counts
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    mountedRef.current = true;
    fetchMetrics();

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchMetrics();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchMetrics]);

  return (
    <AppMetricsContext.Provider
      value={{
        unreadMessagesCount,
        qaActivityCount,
        onlineMembersCount,
        refreshMetrics: fetchMetrics,
      }}
    >
      {children}
    </AppMetricsContext.Provider>
  );
}
