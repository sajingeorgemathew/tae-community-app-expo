import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/auth";

const HEARTBEAT_INTERVAL_MS = 45_000; // 45 seconds

async function sendHeartbeat(userId: string) {
  try {
    await supabase
      .from("presence")
      .upsert(
        { user_id: userId, last_seen_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
  } catch {
    // Fire-and-forget
  }
}

/**
 * Sends periodic presence heartbeats for the authenticated user.
 * Mobile equivalent of the web usePresenceHeartbeat hook.
 * Uses AppState instead of document visibility.
 */
export function usePresenceHeartbeat() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!userId) return;

    // Immediate heartbeat
    sendHeartbeat(userId);

    // Periodic heartbeat
    const intervalId = setInterval(() => {
      if (userIdRef.current) sendHeartbeat(userIdRef.current);
    }, HEARTBEAT_INTERVAL_MS);

    // Heartbeat on app foreground
    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active" && userIdRef.current) {
          sendHeartbeat(userIdRef.current);
        }
      },
    );

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [userId]);
}
