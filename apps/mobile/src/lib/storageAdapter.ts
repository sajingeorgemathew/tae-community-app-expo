/**
 * SecureStore-backed StorageAdapter for Supabase auth persistence.
 *
 * Uses expo-secure-store when available (native iOS/Android).
 * Falls back to an in-memory store on platforms where SecureStore is
 * unavailable (e.g. Expo Go on web).
 */

import * as SecureStore from "expo-secure-store";
import type { StorageAdapter } from "@tae/shared";

function isSecureStoreAvailable(): boolean {
  return typeof SecureStore.getItemAsync === "function";
}

function createInMemoryFallback(): StorageAdapter {
  const store = new Map<string, string>();
  console.warn(
    "[storageAdapter] SecureStore unavailable — using in-memory fallback (session will not persist across reloads)"
  );
  return {
    async getItem(key) {
      return store.get(key) ?? null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
  };
}

function createSecureStoreAdapter(): StorageAdapter {
  return {
    async getItem(key) {
      return SecureStore.getItemAsync(key);
    },
    async setItem(key, value) {
      await SecureStore.setItemAsync(key, value);
    },
    async removeItem(key) {
      await SecureStore.deleteItemAsync(key);
    },
  };
}

export const storageAdapter: StorageAdapter = isSecureStoreAvailable()
  ? createSecureStoreAdapter()
  : createInMemoryFallback();
