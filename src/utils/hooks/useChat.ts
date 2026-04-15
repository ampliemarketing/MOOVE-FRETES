/**
 * Custom hook for chat/messaging
 */

import { useState, useEffect, useCallback } from 'react';
import { chatAPI } from '../api-client';
import { toast } from 'sonner@2.0.3';
import { checkSupabaseAvailability } from '../offline-mode';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  freightId?: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Normaliza uma mensagem vinda do Supabase (snake_case) ou de cache
 * (camelCase) para o formato canônico da interface Message.
 */
function normalizeMessage(raw: any): Message {
  return {
    id: raw.id,
    senderId: raw.senderId ?? raw.sender_id ?? '',
    text: raw.text ?? raw.content ?? '',
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    read: raw.read ?? false,
  };
}

/**
 * Normaliza uma conversa vinda do Supabase (snake_case) ou de cache
 * (camelCase) para o formato canônico da interface Conversation.
 */
function normalizeConversation(raw: any): Conversation {
  return {
    id: raw.id,
    participants: raw.participants ?? [],
    freightId: raw.freightId ?? raw.freight_id,
    messages: Array.isArray(raw.messages) ? raw.messages.map(normalizeMessage) : [],
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
  };
}

/** Intervalo de polling para novas mensagens (em ms) */
const CHAT_POLL_INTERVAL_MS = 10_000; // 10 segundos

/** Lê conversas do localStorage sem lançar exceção em caso de JSON inválido */
function safeParseLocalConversations(): any[] {
  try {
    const raw = localStorage.getItem('local_conversations');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se Supabase está disponível antes de tentar carregar
      const isAvailable = await checkSupabaseAvailability();
      if (!isAvailable) {
        const raw = safeParseLocalConversations();
        setConversations(raw.map(normalizeConversation));
        setLoading(false);
        return;
      }

      const response = await chatAPI.getConversations();
      const normalized = (response.data ?? []).map(normalizeConversation);
      setConversations(normalized);

      // Salvar no localStorage para modo offline
      localStorage.setItem('local_conversations', JSON.stringify(normalized));
    } catch (err) {
      // Silenciar erro e usar dados locais
      setConversations(safeParseLocalConversations().map(normalizeConversation));
      // Não definir erro nem logar - sistema funciona sem chat online
    } finally {
      setLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (participantId: string, freightId?: string) => {
    try {
      const response = await chatAPI.createConversation(participantId, freightId);
      if (response.success) {
        // Check if conversation already exists in state
        const exists = conversations.find(c => c.id === response.data.id);
        if (!exists) {
          setConversations(prev => [response.data, ...prev]);
        }
        return { success: true, data: response.data };
      }
      return { success: false, error: 'Erro ao criar conversa' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conversa';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [conversations]);

  const sendMessage = useCallback(async (conversationId: string, text: string) => {
    try {
      const response = await chatAPI.sendMessage(conversationId, text);
      if (response.success) {
        // Update conversation with new message
        setConversations(prev => prev.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: [...conv.messages, response.data],
              updatedAt: new Date().toISOString(),
            };
          }
          return conv;
        }));
        return { success: true, data: response.data };
      }
      return { success: false, error: 'Erro ao enviar mensagem' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar mensagem';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  useEffect(() => {
    loadConversations();
    
    const interval = setInterval(loadConversations, CHAT_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadConversations]);

  return {
    conversations,
    loading,
    error,
    loadConversations,
    createConversation,
    sendMessage,
  };
}