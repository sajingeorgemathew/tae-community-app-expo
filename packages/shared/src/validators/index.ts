// Minimal runtime validators for common payloads

/**
 * Assert a value is a non-empty string. Throws if not.
 */
export function requireString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
}

/**
 * Assert a value looks like a UUID (simple format check).
 */
export function requireUUID(value: unknown, fieldName: string): asserts value is string {
  requireString(value, fieldName);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value as string)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
}

/**
 * Validate a message insert payload has required fields.
 */
export function validateMessageInsert(payload: {
  conversation_id?: unknown;
  sender_id?: unknown;
  content?: unknown;
}): void {
  requireUUID(payload.conversation_id, "conversation_id");
  requireUUID(payload.sender_id, "sender_id");
  requireString(payload.content, "content");
}

/**
 * Validate a post insert payload has required fields.
 */
export function validatePostInsert(payload: {
  author_id?: unknown;
  content?: unknown;
}): void {
  requireUUID(payload.author_id, "author_id");
  requireString(payload.content, "content");
}
