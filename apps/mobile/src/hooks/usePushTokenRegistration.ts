import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import {
  disablePushTokenForCurrentDevice,
  registerPushTokenForUser,
  type PushRegistrationHandle,
} from "../lib/notifications";
import { useAuth } from "../state/auth";

/**
 * Drives the push token lifecycle off the current auth session.
 *
 * - When a signed-in user appears (including after sign-in), request
 *   notification permission, fetch the Expo push token, and upsert into
 *   `public.push_tokens`. Also attach a token-refresh listener.
 * - When the user signs out (session transitions to null), disable the
 *   current device's row for the previous user so a shared device does
 *   not leave an old account's token live.
 *
 * Guards against duplicate writes: registration runs once per user id
 * change, and the refresh listener is torn down on unmount / user change.
 */
export function usePushTokenRegistration(): void {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = userId;

    // Sign-out transition: disable the row we wrote for the prior user.
    if (previousUserId && !userId) {
      void disablePushTokenForCurrentDevice(supabase, previousUserId);
      return;
    }

    if (!userId) return;

    let cancelled = false;
    let handle: PushRegistrationHandle | null = null;

    void registerPushTokenForUser(supabase, userId).then((result) => {
      if (cancelled) {
        result?.remove();
        return;
      }
      handle = result;
    });

    return () => {
      cancelled = true;
      handle?.remove();
      handle = null;
    };
  }, [userId]);
}
