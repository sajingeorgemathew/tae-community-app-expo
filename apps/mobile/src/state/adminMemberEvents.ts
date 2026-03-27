/**
 * Lightweight pub/sub for admin member mutations.
 *
 * AdminMemberDetailScreen emits after a successful save so that
 * FacultyScreen, DirectoryScreen, and other surfaces can refetch
 * without requiring logout/login or navigation tricks.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe — returns an unsubscribe function. */
export function onAdminMemberChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Call after a successful admin member mutation. */
export function emitAdminMemberChange(): void {
  listeners.forEach((fn) => fn());
}
