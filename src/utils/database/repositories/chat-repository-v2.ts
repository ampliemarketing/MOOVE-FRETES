/**
 * Chat Repository - 100% Integrado com Supabase
 * Gerencia Conversations + Messages
 * 
 * ARQUITETURA:
 * 1. Supabase como fonte primária
 * 2. LocalStorage como cache opcional
 * 3. Real-time subscriptions para novas mensagens
 */

import { getSupabaseClient } from '../../supabase/client';
import { db, DBResponse } from '../db-client';
import { KeyPatterns } from '../schema';
import { conversationToSQL, sqlToConversation, messageToSQL, sqlToMessage } from '../adapters';
import { generateId } from '../id-generator';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '../../logger';

// ============================================
// TYPES
// ============================================

interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  freightId?: string;
  lastMessageAt: string;
  createdAt: string;
  metadata?: any;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'location' | 'quote';
  attachments?: any[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  metadata?: any;
}

// ============================================
// CONVERSATION REPOSITORY
// ============================================

export class ConversationRepository {
  /**
   * Create or get existing conversation
   * ✅ Evita duplicação - busca existente primeiro
   */
  async getOrCreate(
    participant1Id: string,
    participant2Id: string,
    freightId?: string
  ): Promise<DBResponse<Conversation>> {
    try {
      // 1. BUSCAR CONVERSA EXISTENTE
      const supabase = getSupabaseClient();
      
      const { data: existing, error: searchError } = await supabase
        .from('conversations')
        .select('*')
        .or(
          `and(participant1_id.eq.${participant1Id},participant2_id.eq.${participant2Id}),` +
          `and(participant1_id.eq.${participant2Id},participant2_id.eq.${participant1Id})`
        )
        .maybeSingle();

      if (searchError) throw searchError;

      if (existing) {
        const conversation = sqlToConversation(existing);
        await db.set(KeyPatterns.chat(conversation.id), conversation);
        return { success: true, data: conversation };
      }

      // 2. CRIAR NOVA CONVERSA
      const now = new Date().toISOString();

      const sqlData = conversationToSQL({
        // ❌ NÃO passar ID - deixar Supabase gerar UUID automaticamente
        participant1Id,
        participant2Id,
        freightId,
        lastMessageAt: now,
        createdAt: now,
      } as any); // Cast temporário porque conversationToSQL espera id

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          // ❌ NÃO passar ID - deixar Supabase gerar UUID automaticamente
          participant1_id: participant1Id,
          participant2_id: participant2Id,
          freight_id: freightId || null,
          last_message_at: now,
          created_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      const created = sqlToConversation(data);

      // Cache
      await db.set(KeyPatterns.chat(created.id), created);

      return {
        success: true,
        data: created,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get or create conversation',
      };
    }
  }

  /**
   * Get conversation by ID
   */
  async getById(id: string): Promise<DBResponse<Conversation>> {
    try {
      // 1. Cache
      const cached = await db.get<Conversation>(KeyPatterns.chat(id));
      if (cached.success && cached.data) {
        return cached;
      }

      // 2. Supabase
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const conversation = sqlToConversation(data);
      await db.set(KeyPatterns.chat(id), conversation);

      return {
        success: true,
        data: conversation,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get conversation',
      };
    }
  }

  /**
   * Get all conversations for a user
   */
  async getByUserId(userId: string): Promise<DBResponse<Conversation[]>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const conversations = data.map(sqlToConversation);

      // Cache
      for (const conv of conversations) {
        await db.set(KeyPatterns.chat(conv.id), conv);
      }

      return {
        success: true,
        data: conversations,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user conversations',
      };
    }
  }

  /**
   * Update last message timestamp
   */
  async updateLastMessage(conversationId: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) throw error;

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update last message',
      };
    }
  }

  /**
   * Delete conversation
   */
  async delete(id: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();

      // Delete messages first (ignore error — may cascade or have no messages)
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', id);

      if (msgError) {
      }

      // Delete conversation and verify via .select() — RLS silently returns 0 rows when blocked
      const { data: deleted, error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) throw error;

      if (!deleted || deleted.length === 0) {
        console.error('❌ [Chat delete] Nenhuma linha deletada — verifique as políticas RLS da tabela conversations');
        return {
          success: false,
          error: 'Não foi possível excluir a conversa. Sem permissão ou conversa não encontrada.',
        };
      }

      // Clear cache
      await db.del(KeyPatterns.chat(id));

      return { success: true, data: true };
    } catch (error) {
      console.error('❌ [Chat delete] Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete conversation',
      };
    }
  }

  /**
   * Oculta a conversa apenas para um participante (soft delete).
   * ✅ NUNCA apaga mensagens — o histórico continua para o outro lado.
   * Espelha o comportamento do app mobile (ChatListScreen / ChatScreen).
   */
  async softDelete(conversationId: string, userId: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();

      const { data: conv, error: readErr } = await supabase
        .from('conversations')
        .select('participant1_id')
        .eq('id', conversationId)
        .single();
      if (readErr) throw readErr;

      const column = conv?.participant1_id === userId
        ? 'deleted_by_participant1'
        : 'deleted_by_participant2';

      const { data: updated, error } = await supabase
        .from('conversations')
        .update({ [column]: true })
        .eq('id', conversationId)
        .select('id');
      if (error) throw error;

      if (!updated || updated.length === 0) {
        return {
          success: false,
          error: 'Não foi possível ocultar a conversa (sem permissão ou não encontrada).',
        };
      }

      await db.del(KeyPatterns.chat(conversationId));
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to hide conversation',
      };
    }
  }

  /**
   * Reset unread count for a chat
   * ✅ Marca todas as mensagens não lidas como lidas
   */
  async resetUnread(chatId: string, userId: string): Promise<DBResponse<void>> {
    try {
      const supabase = getSupabaseClient();
      
      // Atualizar todas as mensagens não lidas do chat para o usuário
      const { error } = await supabase
        .from('messages')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('conversation_id', chatId)
        .neq('sender_id', userId)
        .eq('is_read', false);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao marcar chat como lido:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset unread'
      };
    }
  }

  async pin(conversationId: string, isPinned: boolean): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('conversations')
        .update({ is_pinned: isPinned })
        .eq('id', conversationId);
      if (error) throw error;
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pin conversation',
      };
    }
  }

  async mute(conversationId: string, isMuted: boolean): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('conversations')
        .update({ is_muted: isMuted })
        .eq('id', conversationId);
      if (error) throw error;
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mute conversation',
      };
    }
  }
}

// ============================================
// MESSAGE REPOSITORY
// ============================================

export class MessageRepository {
  /**
   * Send a message
   * ✅ Salva no Supabase e atualiza conversa
   */
  async send(message: Omit<Message, 'id' | 'createdAt' | 'isRead'>): Promise<DBResponse<Message>> {
    try {
      const now = new Date().toISOString();

      // 1. SALVAR MENSAGEM NO SUPABASE - deixar Supabase gerar UUID
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('messages')
        .insert({
          // ❌ NÃO passar ID - deixar Supabase gerar UUID automaticamente
          conversation_id: message.conversationId,
          sender_id: message.senderId,
          content: message.content,
          message_type: message.type || 'text',
          attachments: message.attachments || [],
          is_read: false,
          created_at: now,
          metadata: message.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      const created = sqlToMessage(data);

      // 2. ATUALIZAR CONVERSA (last_message_at)
      await supabase
        .from('conversations')
        .update({ last_message_at: now })
        .eq('id', message.conversationId);

      // 3. CACHE
      await db.set(KeyPatterns.message(created.id), created);

      return {
        success: true,
        data: created,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }

  /**
   * Get messages by conversation ID
   */
  async getByConversationId(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DBResponse<Message[]>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const messages = data.map(sqlToMessage);

      // Cache
      for (const msg of messages) {
        await db.set(KeyPatterns.message(msg.id), msg);
      }

      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get messages',
      };
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<DBResponse<Message>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;

      const updated = sqlToMessage(data);
      await db.set(KeyPatterns.message(messageId), updated);

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark as read',
      };
    }
  }

  /**
   * Mark all messages in conversation as read
   */
  async markAllAsRead(conversationId: string, userId: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark all as read',
      };
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<DBResponse<number>> {
    try {
      const supabase = getSupabaseClient();
      
      // Get user's conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`);

      if (convError) throw convError;

      const conversationIds = conversations.map(c => c.id);

      // Count unread messages in those conversations
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      return {
        success: true,
        data: count || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get unread count',
      };
    }
  }

  /**
   * Retorna mensagens fixadas de uma conversa.
   *
   * Desabilitado: a coluna `is_pinned` ainda não existe na tabela `messages`
   * do Supabase. Para habilitar, adicione a coluna e descomente a query abaixo:
   *
   *   ALTER TABLE messages ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
   */
  async getPinned(_conversationId: string): Promise<DBResponse<Message[]>> {
    try {
      return { success: true, data: [] };

      /*
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', _conversationId)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data: data.map(sqlToMessage) };
      */
    } catch (error) {
      logger.error('❌ Erro ao buscar mensagens fixadas:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get pinned messages',
      };
    }
  }

  /**
   * Subscribe to new messages in a conversation (Real-time)
   */
  subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void
  ): RealtimeChannel {
    const supabase = getSupabaseClient();
    
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = sqlToMessage(payload.new as any);
          callback(message);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Unsubscribe from real-time updates
   */
  async unsubscribe(channel: RealtimeChannel): Promise<void> {
    await channel.unsubscribe();
  }

  /**
   * Delete message
   */
  async delete(messageId: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      await db.del(KeyPatterns.message(messageId));

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete message',
      };
    }
  }
}

// ============================================
// EXPORTS
// ============================================

export const conversationRepository = new ConversationRepository();
export const messageRepository = new MessageRepository();

// Backward compatibility exports
export const chatRepository = conversationRepository;

// Type aliases for backward compatibility
export type ChatRepository = ConversationRepository;

// Classes are already exported via 'export class' declarations above