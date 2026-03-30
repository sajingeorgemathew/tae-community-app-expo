/**
 * Mobile super-admin identity check (ADMIN-GOV-06B).
 *
 * Reads the SUPER_ADMIN_IDS allowlist from Expo config (set via the
 * SUPER_ADMIN_IDS environment variable in app.config.ts) and exposes
 * a simple isSuperAdmin(userId) helper for mobile code.
 *
 * Config source: process.env.SUPER_ADMIN_IDS → app.config.ts extra →
 * expo-constants → this module.
 *
 * Fail-closed: when SUPER_ADMIN_IDS is unset or empty, isSuperAdmin()
 * returns false for every user.
 */
import Constants from "expo-constants";
import {
  isSuperAdmin as checkSuperAdmin,
  parseSuperAdminIds,
} from "@tae/shared";

/** Resolved once at module load from Expo config. */
const superAdminIds: string[] = parseSuperAdminIds(
  Constants.expoConfig?.extra?.superAdminIds as string | undefined,
);

/**
 * Check whether `userId` is a super-admin on mobile.
 *
 * @param userId  The user ID to check.
 * @returns `true` only when the user ID appears in the configured
 *          SUPER_ADMIN_IDS allowlist. Returns `false` when the
 *          allowlist is missing or empty.
 */
export function isSuperAdmin(userId: string): boolean {
  return checkSuperAdmin(userId, superAdminIds);
}
