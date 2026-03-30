/**
 * Super-admin identity utilities (ADMIN-GOV-06B).
 *
 * Super-admin is a governance overlay, NOT a database role.
 * A super-admin user still has role = "admin" in the database.
 * Identity is resolved from an environment-configured user-ID allowlist
 * (SUPER_ADMIN_IDS), not from schema changes.
 *
 * Safe default: when the allowlist is missing or empty, no user is
 * considered a super-admin (fail closed).
 */

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
 * Check whether `userId` is a super-admin.
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
