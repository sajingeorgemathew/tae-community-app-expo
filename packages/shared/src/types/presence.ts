// Presence types — based on EXPO-01 supabase-contract.md

/** Presence row (custom heartbeat table, not Supabase Realtime) */
export interface PresenceRow {
  user_id: string;
  last_seen_at: string;
}

/** Payload for upserting presence (heartbeat) */
export interface PresenceUpsert {
  user_id: string;
  last_seen_at: string;
}

/** Default threshold (ms) for considering a user "online" */
export const PRESENCE_ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

/** Default heartbeat interval (ms) */
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 45 * 1000; // 45 seconds
