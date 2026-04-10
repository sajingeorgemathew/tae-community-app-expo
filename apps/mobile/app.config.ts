import { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Dynamic Expo config.
 *
 * ADMIN-GOV-06B:
 * Reads SUPER_ADMIN_IDS from the process environment and exposes it
 * via `extra.superAdminIds` so mobile code can access it through
 * expo-constants (Constants.expoConfig.extra.superAdminIds).
 * SUPER_ADMIN_IDS is a comma-separated list of user UUIDs.
 * When unset or empty, no user is treated as super-admin (fail closed).
 *
 * EXPO-PUSH-02:
 * Wires the `expo-notifications` config plugin so the mobile app is
 * prepared for push notifications in a future ticket. This only
 * configures the plugin — it does NOT register tokens or send
 * notifications yet.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const superAdminIdsRaw = process.env.SUPER_ADMIN_IDS ?? "";

  const basePlugins = ((config as ExpoConfig).plugins ?? []) as NonNullable<
    ExpoConfig["plugins"]
  >;

  const hasNotificationsPlugin = basePlugins.some((p) => {
    if (typeof p === "string") return p === "expo-notifications";
    if (Array.isArray(p)) return p[0] === "expo-notifications";
    return false;
  });

  const plugins: NonNullable<ExpoConfig["plugins"]> = hasNotificationsPlugin
    ? basePlugins
    : [
        ...basePlugins,
        [
          "expo-notifications",
          {
            // Default foreground notification color on Android.
            color: "#ffffff",
          },
        ],
      ];

  return {
    ...(config as ExpoConfig),
    plugins,
    extra: {
      ...((config as ExpoConfig).extra ?? {}),
      superAdminIds: superAdminIdsRaw,
    },
  };
};
