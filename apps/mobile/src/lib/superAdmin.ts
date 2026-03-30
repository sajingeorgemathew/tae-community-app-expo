/**
 * Mobile super-admin identity check (ADMIN-GOV-06B / 06D).
 *
 * Provides two helpers:
 *   - isSuperAdmin(userId)        — synchronous, env-only (original)
 *   - isSuperAdminFull(userId)    — async, checks env + DB table
 *
 * Config source: process.env.SUPER_ADMIN_IDS → app.config.ts extra →
 * expo-constants → this module.
 *
 * Fail-closed: when SUPER_ADMIN_IDS is unset/empty AND the user is not
 * in the super_admins table, both helpers return false.
 */
import Constants from "expo-constants";
import {
  isSuperAdmin as checkSuperAdmin,
  isSuperAdminWithDb,
  parseSuperAdminIds,
} from "@tae/shared";
import { supabase } from "./supabase";

/** Resolved once at module load from Expo config. */
const superAdminIds: string[] = parseSuperAdminIds(
  Constants.expoConfig?.extra?.superAdminIds as string | undefined,
);

/**
 * Synchronous env-only super-admin check (ADMIN-GOV-06B).
 *
 * @param userId  The user ID to check.
 * @returns `true` only when the user ID appears in the configured
 *          SUPER_ADMIN_IDS allowlist. Returns `false` when the
 *          allowlist is missing or empty.
 */
export function isSuperAdmin(userId: string): boolean {
  return checkSuperAdmin(userId, superAdminIds);
}

/**
 * Async super-admin check: env allowlist OR super_admins table (ADMIN-GOV-06D).
 *
 * Use this when you need the full picture (env + DB).
 * Falls back to env-only if the DB query fails (fail-closed).
 *
 * @param userId  The user ID to check.
 */
export async function isSuperAdminFull(userId: string): Promise<boolean> {
  return isSuperAdminWithDb(userId, superAdminIds, supabase);
}
