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

/** Colour set for role badges. */
export interface RoleBadgeColors {
  bg: string;
  text: string;
  border: string;
}

const ROLE_BADGE_COLORS: Record<string, RoleBadgeColors> = {
  tutor: { bg: "#d1fae5", text: "#047857", border: "#a7f3d0" },
  admin: { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
};

const DEFAULT_BADGE_COLORS: RoleBadgeColors = {
  bg: "#f1f5f9",
  text: "#475569",
  border: "#e2e8f0",
};

export function roleBadgeColors(role: string): RoleBadgeColors {
  return ROLE_BADGE_COLORS[role] ?? DEFAULT_BADGE_COLORS;
}
