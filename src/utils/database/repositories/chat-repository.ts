/**
 * Chat Repository - 100% Integrado com Supabase
 * VERSÃO FINAL - Conversations + Messages
 */

// Re-export everything from v2
export {
  ConversationRepository,
  MessageRepository,
  conversationRepository,
  messageRepository,
  chatRepository,
} from './chat-repository-v2';

// Export type alias separately
export type { ChatRepository } from './chat-repository-v2';