// Conversation types — based on EXPO-01 supabase-contract.md

/** Shape returned by get_my_conversations RPC */
export interface ConversationListItem {
  conversation_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar_path: string | null;
  last_message_content: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_unread: boolean;
}

/** Conversation read tracking */
export interface ConversationRead {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
}

/** Conversation delivery tracking */
export interface ConversationDelivery {
  conversation_id: string;
  user_id: string;
  last_delivered_at: string;
}

/** Args for create_conversation_1to1 RPC */
export interface CreateConversation1to1Args {
  other_user_id: string;
}

/** Args for get_conversation_read_state RPC */
export interface GetConversationReadStateArgs {
  conv_id: string;
}

/** Return type of get_conversation_read_state RPC */
export interface ConversationReadState {
  other_last_read_at: string;
}
