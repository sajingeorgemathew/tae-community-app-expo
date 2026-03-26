// ---------------------------------------------------------------------------
// Lightweight messaging-state-change notifier
//
// Screens that display messaging state (Home unread count, Messages list)
// subscribe via `onMessagingStateChange`. Screens that mutate messaging state
// (ConversationScreen: send, mark-read) call `notifyMessagingStateChange`.
//
// This is intentionally minimal — a simple callback registry, not a full
// reactive/realtime system.
// ---------------------------------------------------------------------------

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe to messaging state changes. Returns an unsubscribe function. */
export function onMessagingStateChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Notify all subscribers that messaging state has changed. */
export function notifyMessagingStateChange(): void {
  listeners.forEach((fn) => fn());
}
