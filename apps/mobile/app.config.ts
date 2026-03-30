import { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Dynamic Expo config (ADMIN-GOV-06B).
 *
 * Reads SUPER_ADMIN_IDS from the process environment and exposes it
 * via `extra.superAdminIds` so mobile code can access it through
 * expo-constants (Constants.expoConfig.extra.superAdminIds).
 *
 * SUPER_ADMIN_IDS is a comma-separated list of user UUIDs.
 * When unset or empty, no user is treated as super-admin (fail closed).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const superAdminIdsRaw = process.env.SUPER_ADMIN_IDS ?? "";

  return {
    ...(config as ExpoConfig),
    extra: {
      ...((config as ExpoConfig).extra ?? {}),
      superAdminIds: superAdminIdsRaw,
    },
  };
};
