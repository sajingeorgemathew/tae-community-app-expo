/**
 * Auth storage adapter contract and constants.
 *
 * Platform-specific implementations (SecureStore, AsyncStorage) will
 * implement this interface in the Expo app layer. A simple in-memory
 * adapter is provided here for tests and dev.
 */

// ---------------------------------------------------------------------------
// Storage adapter interface
// ---------------------------------------------------------------------------

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Storage key constants
// ---------------------------------------------------------------------------

export const AUTH_STORAGE_KEYS = {
  /** Full Supabase session JSON (access_token, refresh_token, etc.) */
  SESSION: "tae_supabase_session",
} as const;

// ---------------------------------------------------------------------------
// In-memory adapter (tests / dev)
// ---------------------------------------------------------------------------

export function createInMemoryStorageAdapter(): StorageAdapter {
  const store = new Map<string, string>();

  return {
    async getItem(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      store.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      store.delete(key);
    },
  };
}
