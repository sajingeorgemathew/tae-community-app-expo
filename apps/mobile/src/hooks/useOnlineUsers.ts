import { useCallback, useEffect, useRef, useState } from "react";
import { PRESENCE_ONLINE_THRESHOLD_MS } from "@tae/shared";
import { supabase } from "../lib/supabase";

/**
 * Fetches presence rows for a list of user IDs and returns a Set of those
 * currently online (within the presence threshold).
 *
 * Re-fetches when userIds changes (by joined-string identity).
 */
export function useOnlineUsers(userIds: string[]): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set());
  const key = userIds.slice().sort().join(",");

  const fetch = useCallback(async () => {
    if (userIds.length === 0) {
      setOnline(new Set());
      return;
    }
    try {
      const { data } = await supabase
        .from("presence")
        .select("user_id, last_seen_at")
        .in("user_id", userIds);

      if (!data) return;

      const now = Date.now();
      const result = new Set<string>();
      for (const row of data) {
        if (now - new Date(row.last_seen_at).getTime() <= PRESENCE_ONLINE_THRESHOLD_MS) {
          result.add(row.user_id);
        }
      }
      setOnline(result);
    } catch {
      // Non-critical — leave stale set
    }
  }, [key]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return online;
}
