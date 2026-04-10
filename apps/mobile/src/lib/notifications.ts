/**
 * Push notifications: foreground handler, Android channel, and the mobile
 * token lifecycle (permission -> token fetch -> upsert -> refresh listener
 * -> sign-out disable). EXPO-PUSH-02 + EXPO-PUSH-04.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_ANDROID_CHANNEL_ID = "default";

let handlerConfigured = false;
let androidChannelConfigured = false;

/**
 * Configure how notifications behave when the app is in the foreground.
 * Safe to call multiple times; only the first call takes effect.
 */
export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Ensure the Android default notification channel exists. No-op on iOS/web.
 * Android requires a channel for notifications to display on API 26+.
 */
export async function ensureAndroidDefaultChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  if (androidChannelConfigured) return;
  androidChannelConfigured = true;

  await Notifications.setNotificationChannelAsync(DEFAULT_ANDROID_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FFFFFF",
  });
}

/**
 * One-shot bootstrap called from the app root. Installs the foreground
 * handler and sets up the Android default channel. Errors are swallowed
 * so a notification setup failure can never crash the app.
 */
export async function bootstrapNotifications(): Promise<void> {
  try {
    configureNotificationHandler();
    await ensureAndroidDefaultChannel();
  } catch {
    // Intentionally ignored — notifications are non-critical at boot.
  }
}

// ---------------------------------------------------------------------------
// EXPO-PUSH-04: token lifecycle
// ---------------------------------------------------------------------------

const DEVICE_ID_KEY = "tae.deviceId";

function generateUuidV4(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  // RFC 4122 v4 fallback using Math.random — sufficient for a local device id.
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += "-";
      continue;
    }
    if (i === 14) {
      out += "4";
      continue;
    }
    const r = Math.floor(Math.random() * 16);
    if (i === 19) {
      out += hex[(r & 0x3) | 0x8];
      continue;
    }
    out += hex[r];
  }
  return out;
}

/**
 * Return a stable device id from SecureStore, generating one on first call.
 * The same id survives token rotation and sign-out; it is only wiped on
 * app uninstall (SecureStore lifecycle).
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const fresh = generateUuidV4();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, fresh);
  return fresh;
}

function resolveProjectId(): string | undefined {
  const expoConfig = Constants.expoConfig as
    | { extra?: { eas?: { projectId?: string } } }
    | null
    | undefined;
  const easConfig = Constants.easConfig as
    | { projectId?: string }
    | null
    | undefined;
  return expoConfig?.extra?.eas?.projectId ?? easConfig?.projectId;
}

function resolvePlatform(): "ios" | "android" | null {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return null;
}

function resolveAppVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return (
    req.granted ||
    req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function upsertPushTokenRow(
  supabase: SupabaseClient,
  params: {
    userId: string;
    deviceId: string;
    token: string;
    platform: "ios" | "android";
    appVersion: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: params.userId,
      device_id: params.deviceId,
      token: params.token,
      provider: "expo",
      platform: params.platform,
      app_version: params.appVersion,
      enabled: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_id" },
  );
  if (error) {
    // Non-fatal: token will be retried on next sign-in / refresh.
    // eslint-disable-next-line no-console
    console.warn("[push] upsert failed:", error.message);
  }
}

export interface PushRegistrationHandle {
  /** Tear down the token refresh listener. */
  remove: () => void;
}

/**
 * Register (or refresh) the push token for the given signed-in user.
 *
 * Fails safely: a denied permission, missing projectId, or token-fetch
 * error is logged and results in `null` — the app continues to work.
 */
export async function registerPushTokenForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<PushRegistrationHandle | null> {
  try {
    const platform = resolvePlatform();
    if (!platform) return null;

    const granted = await ensureNotificationPermission();
    if (!granted) return null;

    await ensureAndroidDefaultChannel();

    const projectId = resolveProjectId();
    if (!projectId) {
      // eslint-disable-next-line no-console
      console.warn(
        "[push] no eas.projectId in app config; skipping token fetch.",
      );
      return null;
    }

    const deviceId = await getOrCreateDeviceId();
    const appVersion = resolveAppVersion();

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenResponse.data;

    await upsertPushTokenRow(supabase, {
      userId,
      deviceId,
      token,
      platform,
      appVersion,
    });

    const subscription = Notifications.addPushTokenListener((event) => {
      void upsertPushTokenRow(supabase, {
        userId,
        deviceId,
        token: event.data,
        platform,
        appVersion,
      });
    });

    return { remove: () => subscription.remove() };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[push] registerPushTokenForUser failed:", err);
    return null;
  }
}

/**
 * Mark the current device's row disabled for `userId`. Used on sign-out so
 * a shared device does not leave a prior account's token live.
 */
export async function disablePushTokenForCurrentDevice(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  try {
    const deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) return;
    const { error } = await supabase
      .from("push_tokens")
      .update({ enabled: false, last_seen_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("device_id", deviceId);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[push] disable failed:", error.message);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[push] disablePushTokenForCurrentDevice failed:", err);
  }
}
