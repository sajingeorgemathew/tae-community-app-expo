/**
 * Route guard helpers — pure functions, no React or navigation dependencies.
 *
 * These mirror the web app's middleware.ts route protection logic
 * for use in React Navigation on mobile.
 */

// ---------------------------------------------------------------------------
// Protected route definitions
// ---------------------------------------------------------------------------

/** Route name prefixes that require authentication (mirrors web /app/*). */
export const PROTECTED_ROUTE_PREFIXES = ["App", "Admin"] as const;

/** Route names that are only for unauthenticated users (mirrors web /login, /signup). */
export const AUTH_ONLY_ROUTES = ["Login", "Signup"] as const;

// ---------------------------------------------------------------------------
// Guard functions
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the given route name requires an authenticated session.
 * Mirrors: web middleware protecting `/app` and `/app/*`.
 */
export function isProtectedRoute(routeName: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => routeName === prefix || routeName.startsWith(prefix)
  );
}

/**
 * Returns the initial navigation stack based on session state.
 *
 * - Authenticated → "AppStack"
 * - Unauthenticated → "AuthStack"
 */
export function getInitialRoute(hasSession: boolean): "AppStack" | "AuthStack" {
  return hasSession ? "AppStack" : "AuthStack";
}

/**
 * Determines if a redirect is needed based on the current route and session.
 * Returns the target route name, or `null` if no redirect is needed.
 *
 * Rules (mirroring web middleware):
 * 1. Protected route + no session → redirect to "Login"
 * 2. Auth-only route + has session → redirect to "App"
 * 3. Otherwise → null (no redirect)
 */
export function shouldRedirect(
  routeName: string,
  hasSession: boolean
): string | null {
  if (isProtectedRoute(routeName) && !hasSession) {
    return "Login";
  }

  if (
    (AUTH_ONLY_ROUTES as readonly string[]).includes(routeName) &&
    hasSession
  ) {
    return "App";
  }

  return null;
}
