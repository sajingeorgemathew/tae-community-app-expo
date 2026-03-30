/**
 * Super-admin identity utilities (ADMIN-GOV-06B / 06D).
 *
 * Super-admin is a governance overlay, NOT a database role.
 * A super-admin user still has role = "admin" in the database.
 *
 * Identity is resolved from TWO sources (either grants super-admin):
 *   1. Environment-configured user-ID allowlist (SUPER_ADMIN_IDS) — bootstrap
 *   2. `super_admins` database table — runtime-managed (ADMIN-GOV-06D)
 *
 * Safe default: when both sources are empty, no user is considered a
 * super-admin (fail closed).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Parse a raw comma-separated SUPER_ADMIN_IDS string into a trimmed array.
 * Returns an empty array when the input is undefined, null, or blank.
 */
export function parseSuperAdminIds(raw: string | undefined | null): string[] {
  if (!raw || raw.trim() === "") return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/**
 * Check whether `userId` is a super-admin via the env allowlist only.
 *
 * This is the original synchronous check (ADMIN-GOV-06B).
 * It does NOT query the database.
 *
 * @param userId          The user ID to check.
 * @param superAdminIds   The resolved allowlist of super-admin user IDs.
 * @returns `true` only when `userId` is a non-empty string present in a
 *          non-empty `superAdminIds` array.
 */
export function isSuperAdmin(
  userId: string,
  superAdminIds: string[],
): boolean {
  if (!userId || superAdminIds.length === 0) return false;
  return superAdminIds.includes(userId);
}

/**
 * Check whether `userId` is a super-admin via both env allowlist AND
 * the `super_admins` database table.
 *
 * Returns `true` if the user appears in EITHER source.
 * Fail-closed: returns `false` on DB errors or empty inputs.
 *
 * @param userId          The user ID to check.
 * @param superAdminIds   The resolved env allowlist of super-admin user IDs.
 * @param supabase        A Supabase client instance for the DB lookup.
 */
export async function isSuperAdminWithDb(
  userId: string,
  superAdminIds: string[],
  supabase: SupabaseClient,
): Promise<boolean> {
  if (!userId) return false;

  // Fast path: env allowlist match — no DB round-trip needed.
  if (superAdminIds.length > 0 && superAdminIds.includes(userId)) {
    return true;
  }

  // Slow path: check the super_admins table.
  const { data, error } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Fail closed: treat DB errors as "not a super-admin".
    return false;
  }

  return data !== null;
}
