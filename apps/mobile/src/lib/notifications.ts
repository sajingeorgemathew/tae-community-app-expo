/**
 * Push notifications foundation (EXPO-PUSH-02).
 *
 * This module only sets up the foreground notification handler and the
 * Android default notification channel. It intentionally does NOT:
 *   - request permissions
 *   - obtain or register an Expo push token
 *   - talk to the backend
 *
 * Those will be added in later EXPO-PUSH-* tickets.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

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
