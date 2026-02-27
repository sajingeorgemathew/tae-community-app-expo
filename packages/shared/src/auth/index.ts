// Auth helpers barrel exports

export {
  type StorageAdapter,
  AUTH_STORAGE_KEYS,
  createInMemoryStorageAdapter,
} from "./storage";

export {
  type AuthClientOptions,
  createSupabaseClientWithAuthStorage,
  getInitialSession,
  subscribeToAuthChanges,
  signOutSafe,
} from "./session";

export {
  PROTECTED_ROUTE_PREFIXES,
  AUTH_ONLY_ROUTES,
  isProtectedRoute,
  getInitialRoute,
  shouldRedirect,
} from "./guards";
