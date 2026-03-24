/**
 * Display-mapping for internal role values → user-facing labels.
 *
 * Internal role strings (e.g. "tutor") are kept as-is in the database,
 * queries, and permission logic.  This map only affects what the user sees.
 */
const ROLE_DISPLAY_LABELS: Record<string, string> = {
  tutor: "Instructor",
};

/**
 * Return the user-facing display label for an internal role value.
 *
 * Unknown roles are capitalised so they still look reasonable in the UI
 * (e.g. "student" → "Student").
 */
export function displayRole(role: string): string {
  return (
    ROLE_DISPLAY_LABELS[role] ??
    role.charAt(0).toUpperCase() + role.slice(1)
  );
}
