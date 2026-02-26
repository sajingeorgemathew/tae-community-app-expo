"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/src/lib/supabaseClient";

const HEARTBEAT_INTERVAL_MS = 45_000; // 45 seconds

/**
 * Upserts the current user's presence row.
 * Fire-and-forget — errors are logged in dev only.
 */
async function sendHeartbeat(userId: string) {
  try {
    await supabase
      .from("presence")
      .upsert(
        { user_id: userId, last_seen_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("Presence heartbeat failed", err);
    }
  }
}

/**
 * Starts a presence heartbeat for the authenticated user.
 * Call once at app-shell level. Upserts on mount, every 45 s,
 * and whenever the tab regains focus / becomes visible.
 */
export function usePresenceHeartbeat() {
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled || !session) return;

      const uid = session.user.id;
      userIdRef.current = uid;

      // Immediate heartbeat on mount
      sendHeartbeat(uid);

      // Periodic heartbeat
      intervalId = setInterval(() => sendHeartbeat(uid), HEARTBEAT_INTERVAL_MS);
    }

    init();

    // Visibility / focus handlers
    function onVisibility() {
      if (document.visibilityState === "visible" && userIdRef.current) {
        sendHeartbeat(userIdRef.current);
      }
    }
    function onFocus() {
      if (userIdRef.current) {
        sendHeartbeat(userIdRef.current);
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
}
