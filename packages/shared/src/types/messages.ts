// Message types — based on EXPO-01 supabase-contract.md

/** Message row as returned by select queries */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string | null;
}

/** Payload for inserting a new message */
export interface MessageInsert {
  conversation_id: string;
  sender_id: string;
  content: string;
}

/** Message attachment row */
export interface MessageAttachment {
  id: string;
  message_id: string;
  type: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
}

/** Payload for inserting a message attachment */
export interface MessageAttachmentInsert {
  message_id: string;
  type: string;
  storage_path: string;
  mime_type?: string;
  size_bytes?: number;
}

/** Message with nested attachments (common query shape) */
export interface MessageWithAttachments extends Message {
  message_attachments: MessageAttachment[];
}
