import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { MediaUpload, MediaFile } from "./ui/media-upload";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { UnifiedUserProfileSheet } from "./UnifiedUserProfileSheet";
import { fetchCompleteUserProfile, type UnifiedUserProfile } from '../utils/user-profile-helper';
import { 
  MessageCircle, 
  Send, 
  MoreVertical,
  User,
  Truck,
  Package,
  ArrowLeft,
  Search,
  Plus,
  CheckCheck,
  Check,
  Clock,
  Shield,
  Image as ImageIcon,
  Paperclip,
  Download,
  FileText,
  X,
  Trash2,
  UserCircle,
  Mail,
  Phone,
  MapPin,
  Star,
  Edit2,
  Copy,
  Reply,
  Smile,
  MoreHorizontal,
  Pin,
  Archive,
  Volume2,
  Mic,
  Video,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import { useChat } from '../utils/hooks/useChat';
import type { Conversation, Message } from '../utils/hooks/useChat';
import type { User as AppUser } from './contexts/AppContext';
import { database } from '../utils/database';
import { getAvatarUrl } from '../utils/storage-helper'; // ✅ IMPORTAR HELPER DE STORAGE
import ChatMessageItem from './ChatMessageItem';
import { LoadingSpinner } from './LoadingSpinner';
import { copyToClipboard } from '../utils/clipboard-helper';

interface ChatScreenProps {
  user: AppUser;
  initialFreightId?: string | null;
  initialMessage?: string | null;
  initialUserId?: string | null; // ID do usuário para abrir conversa diretamente
  companyId?: string; // Se colaborador, ID do dono da empresa (para atuar como a empresa no chat)
}

interface ChatWithDetails {
  id: string;
  participants: string[];
  lastMessage?: any;
  lastMessageTime?: string;
  unreadCount?: Record<string, number>;
  otherUser?: {
    id: string;
    name: string;
    userType: string;
    avatar?: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
  lastMessageText?: string;
  isPinned?: boolean;
  isMuted?: boolean;
}

interface MessageWithReactions extends Message {
  reactions?: Record<string, string[]>; // emoji -> userIds
  isEdited?: boolean;
  editedAt?: string;
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
  };
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function ChatScreen({ user, initialFreightId, initialMessage, initialUserId, companyId }: ChatScreenProps) {
  // ✅ COLABORADOR: chatIdentityId é o ID da empresa (dono), para compartilhar conversas
  const isCollaborator = !!companyId;
  const chatIdentityId = companyId || user.id;
  const chatDisplayName = isCollaborator ? (user.collaborator?.companyName || user.name) : user.name;
  
  console.log('🚀 [ChatScreen] Renderizado! Props:', {
    userId: user.id,
    userName: user.name,
    isCollaborator,
    chatIdentityId,
    chatDisplayName,
    initialUserId,
    hasInitialMessage: !!initialMessage,
    hasInitialFreightId: !!initialFreightId,
  });
  
  const { conversations, loading: loadingConversations, createConversation, sendMessage } = useChat();
  
  // State Management
  const [selectedChat, setSelectedChat] = useState<ChatWithDetails | null>(null);
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [messages, setMessages] = useState<MessageWithReactions[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const lastErrorRef = useRef<string>('');
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processedInitialUserIdRef = useRef<string | null>(null); // Track if we already processed initialUserId
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UnifiedUserProfile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<ChatWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Advanced Features State
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageWithReactions | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageWithReactions | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<MessageWithReactions[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const messageLimit = 50;
  const [autoScroll, setAutoScroll] = useState(true);
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'pinned'>('all');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadMessagesBelow, setUnreadMessagesBelow] = useState(0);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  
  // Quick replies templates
  const quickReplies = [
    { id: 1, text: '👍 Ok, entendido!', icon: '✓' },
    { id: 2, text: '📞 Vou te ligar agora', icon: '☎' },
    { id: 3, text: '✅ Confirmado!', icon: '✓' },
    { id: 4, text: '⏰ Te respondo em breve', icon: '⌚' },
    { id: 5, text: '📋 Pode enviar mais detalhes?', icon: '?' },
    { id: 6, text: '💰 Qual o valor?', icon: '$' },
  ];

  // Debounce search
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearch = useCallback((term: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setSearchTerm(term);
    }, 300);
  }, []);

  // Debounce for loading chats
  const loadChatsDebounced = useCallback(() => {
    const timeoutId = setTimeout(() => {
      loadChats(false);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [user.id]);

  const createMessageNotification = useCallback(async (message: any, senderName: string) => {
    try {
      const { database } = await import('../utils/database');
      
      await database.notifications.create({
        userId: user.id,
        type: 'message',
        title: `Nova mensagem de ${senderName}`,
        message: message.content.substring(0, 100),
        metadata: {
          conversationId: message.conversation_id,
          senderId: message.sender_id,
          messageId: message.id,
        },
        createdAt: new Date().toISOString(),
        is_read: false,
      });
      
      console.log('📬 [Notificação] Criada');
    } catch (error) {
      console.error('❌ [Notificação] Erro:', error);
    }
  }, [user.id]);

  // Auto-refresh with optimization - less frequent
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = setInterval(() => {
      if (!isLoadingChats && !isLoadingMessages) {
        if (selectedChat) {
          loadMessages(selectedChat.id, false); // silent reload
        }
        loadChats(false); // silent reload
      }
    }, 30000); // Changed to 30 seconds to reduce load

    return () => clearInterval(interval);
  }, [selectedChat?.id, isLoadingChats, isLoadingMessages, user?.id]);

  // Initial load
  useEffect(() => {
    if (!user?.id) {
      console.error('ChatScreen: Invalid user data');
      return;
    }
    
    console.log('🚀 [ChatScreen] Inicializando tela de chat para usuário:', user.id, user.name);
    
    // ✅ Sistema de Presença Online
    const setUserOnline = async () => {
      try {
        const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
        await supabase
          .from('profiles')
          .update({ 
            is_online: true, 
            last_seen: new Date().toISOString() 
          })
          .eq('id', user.id);
      } catch (error) {
        console.error('Erro ao marcar online:', error);
      }
    };
    
    const setUserOffline = async () => {
      try {
        const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
        await supabase
          .from('profiles')
          .update({ 
            is_online: false, 
            last_seen: new Date().toISOString() 
          })
          .eq('id', user.id);
      } catch (error) {
        console.error('Erro ao marcar offline:', error);
      }
    };
    
    setUserOnline();
    
    const heartbeatInterval = setInterval(setUserOnline, 30000);
    
    const handleBeforeUnload = () => setUserOffline();
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // ✅ OTIMIZAÇÃO: Carregar apenas chats (usuários sob demanda)
    loadChats();
    
    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setUserOffline();
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [user.id]);

  // ✅ Realtime listener para mudanças de presença (Online/Offline)
  useEffect(() => {
    if (!user?.id) return;
    
    let channel: any = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isUnmounted = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    let supabaseRef: any = null;
    
    const setupPresenceListener = async () => {
      if (isUnmounted) return;
      
      const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
      supabaseRef = supabase;
      
      // Remover canal anterior corretamente com removeChannel
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          // Canal já removido - ignorar
        }
        channel = null;
      }
      
      // Usar nome de canal único para evitar colisões
      const channelName = `users_presence_${user.id}_${Date.now()}`;
      
      channel = supabase
        .channel(channelName, {
          config: { broadcast: { self: false } }
        })
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
          },
          (payload: any) => {
            setChats(prev => prev.map(chat => {
              if (chat.otherUser?.id === payload.new.id) {
                return {
                  ...chat,
                  otherUser: {
                    ...chat.otherUser,
                    isOnline: payload.new.is_online,
                    lastSeen: payload.new.last_seen,
                  }
                };
              }
              return chat;
            }));
            
            setSelectedChat(prev => {
              if (prev?.otherUser?.id === payload.new.id) {
                return {
                  ...prev,
                  otherUser: {
                    ...prev.otherUser,
                    isOnline: payload.new.is_online,
                    lastSeen: payload.new.last_seen,
                  }
                };
              }
              return prev;
            });
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            reconnectAttempts = 0;
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
              reconnectTimeout = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (!isUnmounted && !reconnectTimeout && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts++;
              const backoffMs = Math.min(5000 * Math.pow(2, reconnectAttempts - 1), 30000);
              reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                setupPresenceListener();
              }, backoffMs);
            }
          } else if (status === 'CLOSED') {
            // CLOSED durante cleanup (isUnmounted=true) é esperado - não reconectar
            if (!isUnmounted && !reconnectTimeout && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts++;
              const backoffMs = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), 30000);
              reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                setupPresenceListener();
              }, backoffMs);
            }
          }
        });
    };
    
    setupPresenceListener();
    
    return () => {
      isUnmounted = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (channel && supabaseRef) {
        try {
          supabaseRef.removeChannel(channel);
        } catch (e) {
          // Ignorar erro na remoção
        }
        channel = null;
      }
    };
  }, [user?.id]);

  // ✅ Listener global para mensagens em QUALQUER conversa (para notificações)
  useEffect(() => {
    if (!user?.id) return;
    
    let channel: any = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isUnmounted = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    let supabaseRef: any = null;
    
    const setupGlobalMessageListener = async () => {
      if (isUnmounted) return;
      
      const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
      supabaseRef = supabase;
      
      // Remover canal anterior corretamente
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          // Canal já removido
        }
        channel = null;
      }
      
      const channelName = `all_messages_${user.id}_${Date.now()}`;
      
      channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: user.id }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload: any) => {
            const newMessage = payload.new as any;
            
            // Ignorar mensagens próprias
            if (newMessage.sender_id === user.id) return;
            
            // Ignorar se for da conversa atualmente aberta
            if (selectedChat?.id === newMessage.conversation_id) return;
            
            // Buscar nome do remetente
            const { data: senderData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', newMessage.sender_id)
              .single();
            
            const senderName = senderData?.name || 'Usuário';
            
            // Criar notificação
            await createMessageNotification(newMessage, senderName);
            
            // Atualizar contador de não lidas no chat
            setChats(prev => prev.map(chat => {
              if (chat.id === newMessage.conversation_id) {
                return {
                  ...chat,
                  unreadCount: {
                    ...chat.unreadCount,
                    [user.id]: (chat.unreadCount?.[user.id] || 0) + 1,
                  },
                  lastMessageText: newMessage.content,
                  lastMessageTime: newMessage.created_at,
                };
              }
              return chat;
            }));
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            reconnectAttempts = 0;
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
              reconnectTimeout = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (!isUnmounted && !reconnectTimeout && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts++;
              const backoffMs = Math.min(5000 * Math.pow(2, reconnectAttempts - 1), 30000);
              reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                setupGlobalMessageListener();
              }, backoffMs);
            }
          } else if (status === 'CLOSED') {
            // Canal fechado é normal durante navegação/hot-reload - não reconectar
          }
        });
    };
    
    setupGlobalMessageListener();
    
    return () => {
      isUnmounted = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (channel && supabaseRef) {
        try {
          supabaseRef.removeChannel(channel);
        } catch (e) {
          // Ignorar
        }
        channel = null;
      }
    };
  }, [user?.id, selectedChat?.id, createMessageNotification]);

  // ✅ Realtime listener para novas mensagens (Supabase)
  useEffect(() => {
    if (!selectedChat?.id || !user?.id) return;
    
    let channel: any = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isUnmounted = false;
    
    const setupRealtimeListener = async () => {
      if (isUnmounted) return;
      
      const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
      
      // Remover canal anterior se existir
      if (channel) {
        try {
          await supabase.removeChannel(channel);
        } catch (e) {
          // Canal já removido
        }
      }
      
      channel = supabase
        .channel(`messages:${selectedChat.id}`, {
          config: {
            broadcast: { self: false },
            presence: { key: user.id }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedChat.id}`,
          },
          (payload) => {
            const newMessage = payload.new as any;
            
            setMessages(prev => {
              // Verificar se mensagem já existe
              if (prev.some(m => m.id === newMessage.id)) {
                return prev;
              }
              
              return [...prev, {
                id: newMessage.id,
                chatId: newMessage.conversation_id,
                senderId: newMessage.sender_id,
                senderName: newMessage.sender_id === user.id ? chatDisplayName : 'Outro usuário',
                content: newMessage.content,
                type: newMessage.message_type || 'text',
                attachments: newMessage.attachments || [],
                status: 'sent',
                readBy: [], // ⚠️ read_by não existe no Supabase
                isRead: newMessage.is_read || false,
                replyTo: newMessage.reply_to,
                timestamp: newMessage.created_at,
                createdAt: newMessage.created_at,
              }];
            });
            
            // Auto scroll instantâneo
            setAutoScroll(true);
            scrollToBottom('auto');
            if (newMessage.sender_id !== user.id) {
              playNotificationSound();
              createMessageNotification(newMessage, selectedChat.otherUser?.name || 'Usuário');
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
              reconnectTimeout = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (!isUnmounted && !reconnectTimeout) {
              reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                setupRealtimeListener();
              }, 5000);
            }
          } else if (status === 'CLOSED') {
            // Canal fechado é normal durante navegação - não reconectar
          }
        });
    };
    
    setupRealtimeListener();
    
    return () => {
      isUnmounted = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (channel) {
        const cleanup = async () => {
          const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
          try {
            supabase.removeChannel(channel);
          } catch (e) {
            // Ignorar
          }
        };
        cleanup();
      }
    };
  }, [selectedChat?.id, user?.id]);

  // Handle initial freight
  useEffect(() => {
    const handleInitialFreight = async () => {
      if (initialFreightId && chats.length > 0) {
        console.log('🔍 Procurando conversa para o frete:', initialFreightId);
        
        // Primeiro, tentar encontrar uma conversa diretamente vinculada ao freightId
        let existingChat = chats.find(chat => 
          (chat as any).freightId === initialFreightId
        );
        
        if (existingChat) {
          console.log('✅ Conversa encontrada diretamente pelo freightId');
          setSelectedChat(existingChat);
          toast.success('Chat aberto para este frete');
          return;
        }
        
        // Se não encontrar, buscar o frete e tentar pelo dono
        const freightResponse = await database.freights.getById(initialFreightId);
        if (freightResponse.success && freightResponse.data) {
          const freight = freightResponse.data;
          
          // O dono do frete é quem publicou (publisherId para Supabase ou customerId para local)
          const ownerId = (freight as any).publisherId || (freight as any).publisher_id || freight.customerId;
          
          console.log('🔍 Procurando chat com o dono do frete:', ownerId);
          
          existingChat = chats.find(chat => 
            chat.otherUser?.id === ownerId
          );
          
          if (existingChat) {
            console.log('✅ Conversa encontrada pelo dono do frete');
            setSelectedChat(existingChat);
            toast.success('Chat aberto para este frete');
          } else {
            console.log('📝 Criando nova conversa com o dono do frete');
            const ownerResponse = await database.users.getById(ownerId);
            if (ownerResponse.success && ownerResponse.data) {
              handleStartNewChat(ownerResponse.data.id);
            } else {
              toast.error('Não foi possível abrir o chat para este frete');
            }
          }
        } else {
          toast.error('Frete não encontrado');
        }
      }
    };
    
    handleInitialFreight();
  }, [initialFreightId, chats.length]);

  // Handle initial user - open chat directly with a specific user
  useEffect(() => {
    const handleInitialUser = async () => {
      console.log('🔍 [ChatScreen useEffect initialUserId] Estado:', {
        initialUserId,
        hasInitialUserId: !!initialUserId,
        processedBefore: processedInitialUserIdRef.current,
        chatsLength: chats.length,
        hasSelectedChat: !!selectedChat,
      });
      
      // ✅ IMPORTANTE: Processar initialUserId apenas se:
      // 1. initialUserId está definido
      // 2. Ainda não processamos esse initialUserId
      // 3. Não há chat selecionado
      if (initialUserId && processedInitialUserIdRef.current !== initialUserId && !selectedChat) {
        console.log('✅ [ChatScreen] PROCESSANDO initialUserId:', initialUserId);
        
        // Marcar como processado para evitar loops
        processedInitialUserIdRef.current = initialUserId;
        
        // Tentar encontrar conversa existente com este usuário
        let existingChat = chats.find(chat => 
          chat.otherUser?.id === initialUserId
        );
        
        if (existingChat) {
          console.log('✅ [ChatScreen] Conversa existente encontrada:', existingChat.id);
          setSelectedChat(existingChat);
          toast.success('Chat aberto');
        } else {
          // Se não existe, criar nova conversa (mesmo sem outras conversas)
          console.log('📝 [ChatScreen] Criando nova conversa com o usuário:', initialUserId);
          handleStartNewChat(initialUserId);
        }
      }
    };
    
    handleInitialUser();
  }, [initialUserId, chats, selectedChat]);

  // Pre-fill message input with initial message when chat is selected
  useEffect(() => {
    if (initialMessage && selectedChat && !messageInput) {
      console.log('📝 Preenchendo campo de mensagem com detalhes do frete');
      setMessageInput(initialMessage);
      // Auto scroll to message input
      setTimeout(() => {
        const messageInputElement = document.querySelector('textarea[placeholder*="Escreva"]');
        if (messageInputElement) {
          (messageInputElement as HTMLElement).focus();
        }
      }, 300);
    }
  }, [initialMessage, selectedChat]);

  // Load messages when chat is selected - optimized
  useEffect(() => {
    if (!selectedChat?.id) return;
    
    // Clear previous messages for instant feedback
    setMessages([]);
    
    // Small debounce to avoid rapid switches
    const timeoutId = setTimeout(() => {
      loadMessages(selectedChat.id);
      markChatAsRead(selectedChat.id);
      loadPinnedMessages(selectedChat.id);
      // updateLastViewedAt(selectedChat.id); // ❌ Desabilitado: RLS policy bloqueia - markChatAsRead já marca como lido
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [selectedChat?.id]);

  // Smart scroll
  useEffect(() => {
    if (autoScroll) {
      scrollToBottom('smooth');
    }
  }, [messages.length]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setAutoScroll(isAtBottom);
    setShowScrollButton(!isAtBottom);
    
    // Load more messages when scrolling to top
    if (scrollTop < 100 && hasMoreMessages && !loadingOlderMessages) {
      loadOlderMessages();
    }
  }, [hasMoreMessages, loadingOlderMessages]);

  // Typing indicator
  const handleTyping = useCallback(() => {
    if (!selectedChat) return;
    
    setIsTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, [selectedChat]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const loadAllUsers = async () => {
    try {
      const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
      
      // ✅ OTIMIZAÇÃO: Buscar apenas campos necessários
      const { data: supabaseUsers, error: supabaseError } = await supabase
        .from('profiles')
        .select('id, name, email, user_type, avatar_url, is_online')
        .neq('id', chatIdentityId) // ✅ Excluir a identidade da empresa (ou do próprio)
        .neq('id', user.id) // ✅ Excluir também o próprio colaborador
        .order('name');

      if (supabaseError) {
        toast.error('Erro ao carregar usuários');
        setUsers([]);
        return;
      }

      if (!supabaseUsers || supabaseUsers.length === 0) {
        setUsers([]);
        return;
      }
      
      const transformedUsers = supabaseUsers.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        userType: u.user_type,
        profile: { avatar: getAvatarUrl(u.avatar_url) }, // ✅ CONVERTER PATH → URL
        isOnline: u.is_online || false,
      }));
      
      console.log('📤 [ChatScreen] Salvando', transformedUsers.length, 'usuários no estado');
      setUsers(transformedUsers);
    } catch (error) {
      console.error('❌ [ChatScreen] Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
      setUsers([]);
    }
  };

  const showErrorToast = (message: string) => {
    const now = Date.now();
    
    if (lastErrorRef.current === message) {
      return;
    }
    
    lastErrorRef.current = message;
    toast.error(message);
    
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      lastErrorRef.current = '';
    }, 5000);
  };

  const loadChats = async (showLoading = true) => {
    if (isLoadingChats) return;
    
    if (showLoading) setIsLoadingChats(true);
    try {
      console.time('⏱️ Load Chats Total');
      
      const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
      
      // ✅ OTIMIZAÇÃO: Buscar conversas E perfis em PARALELO
      const [conversationsResult, profilesResult] = await Promise.all([
        supabase
          .from('conversations')
          .select('id, participant1_id, participant2_id, freight_id, created_at, last_message_at')
          .or(`participant1_id.eq.${chatIdentityId},participant2_id.eq.${chatIdentityId}`)
          .order('last_message_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, name, email, user_type, avatar_url, is_online, last_seen')
      ]);

      if (conversationsResult.error) {
        console.error('❌ Erro:', conversationsResult.error);
        setChats([]);
        if (showLoading) setIsLoadingChats(false);
        return;
      }
      
      const supabaseConversations = conversationsResult.data;
      const allProfiles = profilesResult.data;
      
      if (!supabaseConversations || supabaseConversations.length === 0) {
        setChats([]);
        if (showLoading) setIsLoadingChats(false);
        return;
      }
      
      // ✅ Buscar últimas mensagens
      const conversationIds = supabaseConversations.map((conv: any) => conv.id);
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender_id')
        .in('conversation_id', conversationIds)
        .order('conversation_id')
        .order('created_at', { ascending: false });
      
      const lastMessageMap = new Map();
      if (lastMessages) {
        lastMessages.forEach((msg: any) => {
          if (!lastMessageMap.has(msg.conversation_id)) {
            lastMessageMap.set(msg.conversation_id, {
              content: msg.content,
              timestamp: msg.created_at,
              senderId: msg.sender_id,
            });
          }
        });
      }
      
      // ✅ Map de perfis para lookup O(1)
      const profilesMap = new Map();
      if (allProfiles) {
        allProfiles.forEach((p: any) => {
          profilesMap.set(p.id, {
            id: p.id,
            name: p.name,
            email: p.email,
            userType: p.user_type,
            profile: { avatar: getAvatarUrl(p.avatar_url) }, // ✅ CONVERTER PATH → URL
            isOnline: p.is_online || false,
            lastSeen: p.last_seen,
          });
        });
      }
      
      const enrichedChats = supabaseConversations
        .map((conv: any) => {
          const otherUserId = conv.participant1_id === chatIdentityId 
            ? conv.participant2_id 
            : conv.participant1_id;
          
          const otherUserData = profilesMap.get(otherUserId);
          const lastMsg = lastMessageMap.get(conv.id);
          
          return {
            id: conv.id,
            participants: [conv.participant1_id, conv.participant2_id],
            type: 'direct' as const,
            freightId: conv.freight_id,
            unreadCount: {},
            lastMessage: lastMsg || null,
            isPinned: false,
            isMuted: false,
            isArchived: false,
            createdAt: conv.created_at,
            updatedAt: conv.last_message_at || conv.created_at,
            otherUser: otherUserData ? {
              id: otherUserData.id,
              name: otherUserData.name,
              userType: otherUserData.userType,
              avatar: getAvatarUrl(otherUserData.profile?.avatar), // ✅ CONVERTER PATH → URL
              isOnline: otherUserData.isOnline,
              lastSeen: otherUserData.lastSeen,
            } : undefined,
            lastMessageText: lastMsg?.content,
            lastMessageTime: lastMsg?.timestamp,
          } as ChatWithDetails;
        })
        .filter((chat: ChatWithDetails) => chat.otherUser);
      
      enrichedChats.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
      
      console.timeEnd('⏱️ Load Chats Total');
      setChats(enrichedChats);
    } catch (error) {
      console.error('Error:', error);
      if (showLoading) showErrorToast('Erro ao carregar conversas');
    } finally {
      if (showLoading) setIsLoadingChats(false);
    }
  };

  const loadMessages = async (chatId: string, showLoading = true) => {
    if (isLoadingMessages) return;
    
    console.log('🔄 Carregando mensagens do chat:', chatId);
    
    if (showLoading) setIsLoadingMessages(true);
    try {
      console.time('⏱️ Load Messages');
      
      // ✅ OTIMIZAÇÃO: Carregar apenas 100 mensagens mais recentes COM NOMES
      const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
      const { data: supabaseMessages, error: supabaseError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(name)
        `)
        .eq('conversation_id', chatId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (supabaseError) {
        console.error('❌ Erro ao carregar mensagens:', supabaseError);
        setMessages([]);
        if (showLoading) setIsLoadingMessages(false);
        return;
      }
      
      if (!supabaseMessages || supabaseMessages.length === 0) {
        console.log('📭 Nenhuma mensagem encontrada para o chat:', chatId);
        setMessages([]);
        setHasMoreMessages(false);
        if (showLoading) setIsLoadingMessages(false);
        return;
      }
      
      console.log(`✅ ${supabaseMessages.length} mensagens carregadas`);
      
      // Reverter ordem (mais antigas primeiro)
      const transformedMessages = supabaseMessages
        .reverse()
        .map((msg: any) => ({
          id: msg.id,
          chatId: msg.conversation_id,
          senderId: msg.sender_id,
          senderName: msg.sender?.name || (msg.sender_id === user.id ? chatDisplayName : 'Usuário'), // ✅ Nome do JOIN / empresa se colaborador
          content: msg.content,
          type: msg.message_type || 'text',
          status: 'sent',
          isRead: msg.is_read || false,
          readBy: [], // ⚠️ read_by não existe no Supabase - apenas LocalStorage
          attachments: msg.attachments || [],
          replyTo: msg.reply_to,
          isPinned: false, // ⚠️ is_pinned não existe no Supabase ainda
          editedAt: msg.edited_at,
          timestamp: msg.created_at,
          createdAt: msg.created_at,
        }));

      setMessages(transformedMessages as MessageWithReactions[]);
      setHasMoreMessages(supabaseMessages.length >= 100);
      
      console.timeEnd('⏱️ Load Messages');
    } catch (error) {
      console.error('Error:', error);
      if (showLoading) showErrorToast('Erro ao carregar mensagens');
    } finally {
      if (showLoading) setIsLoadingMessages(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!selectedChat || loadingOlderMessages || !hasMoreMessages) return;
    
    setLoadingOlderMessages(true);
    try {
      const oldestMessage = messages[0];
      if (!oldestMessage) return;
      
      // Load messages before the oldest one
      const response = await database.messages.getByChat(
        selectedChat.id,
        messageLimit,
        oldestMessage.id
      );
      
      if (response.success && response.data) {
        setMessages(prev => [...response.data as MessageWithReactions[], ...prev]);
        setHasMoreMessages(response.data.length >= messageLimit);
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const loadPinnedMessages = async (chatId: string) => {
    try {
      const response = await database.messages.getPinned(chatId);
      if (response.success && response.data) {
        setPinnedMessages(response.data as MessageWithReactions[]);
      }
    } catch (error) {
      console.error('Error loading pinned messages:', error);
    }
  };

  const updateLastViewedAt = async (conversationId: string) => {
    try {
      const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
      
      // Upsert (insert or update) na tabela conversation_participants
      const { error } = await supabase
        .from('conversation_participants')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          last_viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'conversation_id,user_id'
        });
      
      if (error) {
        console.error('Erro ao atualizar last_viewed_at:', error);
      }
    } catch (error) {
      console.error('Erro ao atualizar last_viewed_at:', error);
    }
  };

  const markChatAsRead = async (chatId: string) => {
    try {
      await database.chats.resetUnread(chatId, user.id);
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  const handleSendMessage = async (withMedia: boolean = false) => {
    if (!selectedChat) return;
    if (!withMedia && !messageInput.trim() && !editingMessage) return;
    if (withMedia && mediaFiles.length === 0) return;

    setSendingMessage(true);
    
    try {
      let attachments: any[] | undefined;
      let messageType: 'text' | 'image' | 'file' = 'text';
      let content = messageInput.trim();

      // Handle editing
      if (editingMessage) {
        // Optimistic update - update UI immediately
        const optimisticMessage = {
          ...editingMessage,
          content: messageInput.trim(),
          isEdited: true,
          editedAt: new Date().toISOString(),
        };
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? optimisticMessage : m));
        setEditingMessage(null);
        setMessageInput('');
        setSendingMessage(false);

        // Update in background
        database.messages.update(editingMessage.id, {
          content: messageInput.trim(),
          isEdited: true,
          editedAt: new Date().toISOString(),
        }).then(response => {
          if (response.success) {
            toast.success('Mensagem editada');
          } else {
            toast.error('Erro ao editar mensagem');
            loadMessages(selectedChat.id, false); // Reload on error
          }
        });
        return;
      }

      // Process media files
      if (withMedia && mediaFiles.length > 0) {
        console.log('📤 [ChatScreen] Fazendo upload de', mediaFiles.length, 'anexos para Storage...');
        
        attachments = await Promise.all(
          mediaFiles.map(async (file) => {
            // ✅ Upload para Storage usando uploadChatAttachment
            const { uploadChatAttachment } = await import('../utils/storage-helper');
            const result = await uploadChatAttachment(selectedChat!.id, file.file);
            
            if (!result.success || !result.path) {
              console.error('❌ Erro ao fazer upload:', result.error);
              toast.error(`Erro ao enviar ${file.name}`);
              throw new Error('Upload failed');
            }
            
            console.log('✅ [ChatScreen] Anexo uploadado. PATH:', result.path);
            
            return {
              type: file.type === 'image' ? 'image' : 'document',
              path: result.path,  // ✅ SALVAR PATH, NÃO URL!
              filename: file.name,
              size: file.size,
            };
          })
        );
        
        console.log('✅ [ChatScreen] Todos os anexos uploadados com sucesso');

        messageType = mediaFiles[0].type === 'image' ? 'image' : 'file';
        
        if (!content) {
          content = mediaFiles.length === 1 
            ? mediaFiles[0].name 
            : `${mediaFiles.length} arquivos`;
        }
      }

      // Create optimistic message ID
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Create optimistic message
      const optimisticMessage: MessageWithReactions = {
        id: tempId,
        chatId: selectedChat.id,
        senderId: user.id, // ✅ sender_id = auth.uid() real (para RLS)
        senderName: chatDisplayName, // ✅ Nome da empresa se colaborador
        content,
        type: messageType,
        attachments,
        status: 'sending' as any,
        readBy: [user.id],
        isRead: false,
        createdAt: now,
      };

      if (replyingTo) {
        optimisticMessage.replyTo = {
          id: replyingTo.id,
          content: replyingTo.content,
          senderName: replyingTo.senderName,
        };
      }

      // Add to UI immediately
      setMessages(prev => [...prev, optimisticMessage]);
      setMessageInput('');
      setMediaFiles([]);
      setShowMediaDialog(false);
      setReplyingTo(null);
      setAutoScroll(true);
      setSendingMessage(false);

      // Update chat list optimistically
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, lastMessageText: content, lastMessageTime: now }
          : chat
      ));

      // Play notification sound immediately
      playNotificationSound();

      // Create message data
      const messageData: any = {
        chatId: selectedChat.id,
        senderId: user.id, // ✅ sender_id = auth.uid() real (para RLS)
        senderName: chatDisplayName, // ✅ Nome da empresa se colaborador
        content,
        type: messageType,
        attachments,
        status: 'sent',
        readBy: [user.id],
      };

      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          content: replyingTo.content,
          senderName: replyingTo.senderName,
        };
      }

      // 🔄 GARANTIR QUE A CONVERSA EXISTE NO SUPABASE ANTES DE ENVIAR MENSAGEM
      console.log('🔍 Verificando se conversa existe no Supabase antes de enviar...');
      const otherUserId = selectedChat.participants.find(p => p !== chatIdentityId);
      if (otherUserId) {
        try {
          const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
          const [p1, p2] = [chatIdentityId, otherUserId].sort();
          
          // Verificar se conversa existe
          const { data: existingConv, error: checkError } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', selectedChat.id)
            .maybeSingle();
          
          if (!existingConv && !checkError) {
            console.log('⚠️ Conversa não existe no Supabase, criando agora...');
            
            // 🔥 CRÍTICO: Verificar e criar perfis de usuários primeiro
            console.log('🔍 Verificando se os usuários existem no Supabase...');
            
            // Buscar usuários do LocalStorage
            const currentUserData = JSON.parse(localStorage.getItem(`maisfrete:user:${user.id}`) || '{}');
            const otherUserData = JSON.parse(localStorage.getItem(`maisfrete:user:${otherUserId}`) || '{}');
            
            console.log('👤 Usuário atual:', currentUserData);
            console.log('👤 Outro usuário:', otherUserData);
            
            // Verificar/criar perfil do usuário atual
            const { data: user1Exists } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', user.id)
              .maybeSingle();
            
            if (!user1Exists && currentUserData.id) {
              console.log('📝 Criando perfil do usuário atual no Supabase...');
              await supabase.from('profiles').upsert({
                id: currentUserData.id,
                email: currentUserData.email,
                name: currentUserData.name,
                user_type: currentUserData.userType,
                cpf_cnpj: currentUserData.cpfCnpj || null,
                phone: currentUserData.phone || null,
                status: currentUserData.status || 'active',
                created_at: currentUserData.createdAt || new Date().toISOString(),
              }, { onConflict: 'id' });
              console.log('✅ Perfil do usuário atual criado!');
            }
            
            // Verificar/criar perfil do outro usuário
            const { data: user2Exists } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', otherUserId)
              .maybeSingle();
            
            if (!user2Exists && otherUserData.id) {
              console.log('📝 Criando perfil do outro usuário no Supabase...');
              await supabase.from('profiles').upsert({
                id: otherUserData.id,
                email: otherUserData.email,
                name: otherUserData.name,
                user_type: otherUserData.userType,
                cpf_cnpj: otherUserData.cpfCnpj || null,
                phone: otherUserData.phone || null,
                status: otherUserData.status || 'active',
                created_at: otherUserData.createdAt || new Date().toISOString(),
              }, { onConflict: 'id' });
              console.log('✅ Perfil do outro usuário criado!');
            }
            
            // Agora criar a conversa
            const { error: createError } = await supabase
              .from('conversations')
              .insert({
                id: selectedChat.id,
                participant1_id: p1,
                participant2_id: p2,
                freight_id: initialFreightId || null,
                created_at: new Date().toISOString(),
              });
            
            if (createError) {
              console.error('❌ Erro ao criar conversa no Supabase:', createError);
              toast.error('Erro ao criar conversa. Tente novamente.');
              setMessages(prev => prev.filter(m => m.id !== tempId));
              setSendingMessage(false);
              return;
            }
            
            console.log('✅ Conversa criada no Supabase com sucesso!');
          } else if (existingConv) {
            console.log('✅ Conversa já existe no Supabase');
          }
        } catch (error) {
          console.error('❌ Erro ao verificar/criar conversa:', error);
        }
      }

      // ✅ SALVAR MENSAGEM APENAS NO SUPABASE (sem LocalStorage)
      const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
      
      const { data: savedMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedChat.id,
          sender_id: user.id,
          content,
          message_type: messageType,
          attachments: attachments || [],
          // ❌ REMOVIDO: reply_to não existe na tabela messages do Supabase
          // ❌ REMOVIDO: status não existe na tabela messages do Supabase
          is_read: false,
          created_at: now,
        })
        .select()
        .single();

      if (messageError) {
        console.error('❌ Erro ao salvar mensagem no Supabase:', messageError);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        toast.error('Erro ao enviar mensagem');
        return;
      }

      if (savedMessage) {
        console.log('✅ Mensagem salva no Supabase:', savedMessage.id);
        
        // Replace optimistic message with real one
        setMessages(prev => prev.map(m => 
          m.id === tempId ? {
            id: savedMessage.id,
            chatId: savedMessage.conversation_id,
            senderId: savedMessage.sender_id,
            senderName: chatDisplayName, // ✅ Nome da empresa se colaborador
            content: savedMessage.content,
            type: savedMessage.message_type,
            attachments: savedMessage.attachments,
            status: 'sent',
            readBy: [savedMessage.sender_id], // ✅ Apenas o sender leu inicialmente
            isRead: savedMessage.is_read,
            replyTo: savedMessage.reply_to,
            timestamp: savedMessage.created_at,
            createdAt: savedMessage.created_at,
          } as MessageWithReactions : m
        ));
        
        // Update conversation's last message timestamp
        await supabase
          .from('conversations')
          .update({ last_message_at: now })
          .eq('id', selectedChat.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      setSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedChat) return;
    
    try {
      // Optimistic update - remove from UI immediately
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Mensagem excluída');

      // Delete in background
      const response = await database.messages.delete(messageId);
      if (!response.success) {
        toast.error('Erro ao excluir mensagem');
        loadMessages(selectedChat.id, false); // Reload on error
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erro ao excluir mensagem');
      loadMessages(selectedChat.id, false);
    }
  };

  const handleCopyMessage = async (content: string) => {
    copyToClipboard(content, 'Mensagem copiada');
  };

  const handlePinMessage = async (messageId: string, isPinned: boolean) => {
    if (!selectedChat) return;
    
    try {
      const newPinnedState = !isPinned;
      
      // Optimistic update
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isPinned: newPinnedState } : m
      ));
      
      if (newPinnedState) {
        const message = messages.find(m => m.id === messageId);
        if (message) {
          setPinnedMessages(prev => [...prev, { ...message, isPinned: true }]);
        }
      } else {
        setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
      }
      
      toast.success(isPinned ? 'Mensagem desafixada' : 'Mensagem fixada');
      
      // Update in background
      database.messages.pin(messageId, newPinnedState).catch(error => {
        console.error('Error pinning message:', error);
        toast.error('Erro ao fixar mensagem');
        loadMessages(selectedChat.id, false);
        loadPinnedMessages(selectedChat.id);
      });
    } catch (error) {
      console.error('Error pinning message:', error);
      toast.error('Erro ao fixar mensagem');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!selectedChat) return;
    
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;
      
      const reactions = message.reactions || {};
      const userReactions = reactions[emoji] || [];
      
      let newUserReactions: string[];
      if (userReactions.includes(user.id)) {
        // Remove reaction
        newUserReactions = userReactions.filter(id => id !== user.id);
      } else {
        // Add reaction
        newUserReactions = [...userReactions, user.id];
      }
      
      const newReactions = {
        ...reactions,
        [emoji]: newUserReactions,
      };
      
      // Remove empty arrays
      Object.keys(newReactions).forEach(key => {
        if (newReactions[key].length === 0) {
          delete newReactions[key];
        }
      });
      
      // Optimistic update - update UI immediately
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, reactions: newReactions } : m
      ));
      
      // Update in background
      database.messages.update(messageId, {
        reactions: newReactions,
      }).catch(error => {
        console.error('Error adding reaction:', error);
        toast.error('Erro ao adicionar reação');
        loadMessages(selectedChat.id, false);
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Erro ao adicionar reação');
    }
  };

  const handlePinChat = async (chatId: string, isPinned: boolean) => {
    try {
      const newPinnedState = !isPinned;
      
      // Optimistic update
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, isPinned: newPinnedState } : chat
      ).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      }));
      
      if (selectedChat?.id === chatId) {
        setSelectedChat(prev => prev ? { ...prev, isPinned: newPinnedState } : null);
      }
      
      toast.success(isPinned ? 'Conversa desafixada' : 'Conversa fixada');
      
      // Update in background
      database.chats.pin(chatId, newPinnedState).catch(error => {
        console.error('Error pinning chat:', error);
        toast.error('Erro ao fixar conversa');
        loadChats(false);
      });
    } catch (error) {
      console.error('Error pinning chat:', error);
      toast.error('Erro ao fixar conversa');
    }
  };

  const handleMuteChat = async (chatId: string, isMuted: boolean) => {
    try {
      const newMutedState = !isMuted;
      
      // Optimistic update
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, isMuted: newMutedState } : chat
      ));
      
      if (selectedChat?.id === chatId) {
        setSelectedChat(prev => prev ? { ...prev, isMuted: newMutedState } : null);
      }
      
      toast.success(isMuted ? 'Conversa reativada' : 'Conversa silenciada');
      
      // Update in background
      database.chats.mute(chatId, newMutedState).catch(error => {
        console.error('Error muting chat:', error);
        toast.error('Erro ao silenciar conversa');
        loadChats(false);
      });
    } catch (error) {
      console.error('Error muting chat:', error);
      toast.error('Erro ao silenciar conversa');
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98eadUBELUKnn77RgGAU7k9nyyHkrBSJ0yPDckjwKE1u3/O+nVhQJRp/g8r5uIQUsgc7y2ok2CBtpvfDnnFERClOn4++1YRkFOZPZ8sh5KwUidc7w45E8ChNbtvzvp1UUCEaf3/K+b///');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (error) {
      // Ignore sound errors
    }
  };

  const viewImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageViewerOpen(true);
  };

  const handleStartNewChat = async (otherUserId: string) => {
    console.log('📞 [handleStartNewChat] CHAMADO com otherUserId:', otherUserId);
    setLoading(true);
    try {
      console.log('🔍 [handleStartNewChat] Iniciando nova conversa com:', otherUserId);
      
      // ✅ CRIAR/BUSCAR CONVERSA APENAS NO SUPABASE (sem LocalStorage)
      const supabase = (await import('../utils/supabase/client')).getSupabaseClient();
      
      // Ordenar IDs para garantir consistência
      // ✅ Usar chatIdentityId (empresa) como participante, não o collaborador
      const [p1, p2] = [chatIdentityId, otherUserId].sort();
      
      // Verificar se conversa já existe
      const { data: existingConv, error: checkError } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant1_id', p1)
        .eq('participant2_id', p2)
        .maybeSingle();
      
      let conversation = existingConv;
      
      // Se não existe, criar nova
      if (!existingConv && !checkError) {
        console.log('📝 Criando nova conversa no Supabase...');
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            participant1_id: p1,
            participant2_id: p2,
            freight_id: initialFreightId || null,
            created_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (createError) {
          console.error('❌ Erro ao criar conversa:', createError);
          toast.error('Erro ao iniciar conversa');
          setLoading(false);
          return;
        }
        
        conversation = newConv;
        console.log('✅ Conversa criada:', conversation.id);
      } else {
        console.log('✅ Conversa já existe:', conversation.id);
      }
      
      // Buscar dados do outro usuário do Supabase
      const { data: otherUser, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();
      
      if (userError || !otherUser) {
        console.error('❌ Erro ao buscar usuário:', userError);
        toast.error('Erro ao buscar dados do usuário');
        setLoading(false);
        return;
      }
      
      const enrichedChat: ChatWithDetails = {
        id: conversation.id,
        participants: [conversation.participant1_id, conversation.participant2_id],
        type: 'direct',
        freightId: conversation.freight_id,
        unreadCount: {},
        lastMessage: null,
        isPinned: false,
        isMuted: false,
        isArchived: false,
        createdAt: conversation.created_at,
        updatedAt: conversation.last_message_at || conversation.created_at,
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          userType: otherUser.user_type,
          avatar: getAvatarUrl(otherUser.avatar_url), // ✅ CONVERTER PATH → URL
          isOnline: otherUser.is_online || false,
          lastSeen: otherUser.last_seen,
        },
      };
      
      setSelectedChat(enrichedChat);
      setShowNewChat(false);
      await loadChats(false);
      toast.success(`Conversa com ${otherUser.name} iniciada`);
    } catch (error) {
      console.error('❌ [handleStartNewChat] Erro ao iniciar conversa:', error);
      console.error('❌ [handleStartNewChat] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      console.error('❌ [handleStartNewChat] Detalhes:', {
        otherUserId,
        currentUserId: user.id,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      toast.error('Erro ao iniciar conversa: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (userId: string) => {
    try {
      console.log('🔍 Carregando perfil completo do usuário:', userId);
      const profile = await fetchCompleteUserProfile(userId);
      
      if (profile) {
        console.log('✅ Perfil completo carregado:', {
          name: profile.name,
          userType: profile.userType
        });
        setSelectedUserProfile(profile);
        setProfileDialogOpen(true);
      } else {
        toast.error('Perfil não encontrado');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Erro ao carregar perfil');
    }
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;

    try {
      const response = await database.chats.delete(chatToDelete.id);
      if (response.success) {
        toast.success('Conversa excluída com sucesso');
        setDeleteDialogOpen(false);
        setChatToDelete(null);
        
        if (selectedChat?.id === chatToDelete.id) {
          setSelectedChat(null);
        }
        
        await loadChats();
      } else {
        toast.error('Erro ao excluir conversa');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Erro ao excluir conversa');
    }
  };

  const confirmDeleteChat = (chat: ChatWithDetails) => {
    setChatToDelete(chat);
    setDeleteDialogOpen(true);
  };

  const formatMessageTime = useCallback((timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }, []);

  const formatChatTime = useCallback((timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  }, []);

  const formatLastSeen = useCallback((lastSeen?: string): string => {
    if (!lastSeen) return 'nunca';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('pt-BR');
  }, []);

  const getUserIcon = useCallback((userType: string) => {
    switch (userType) {
      case 'transportadora':
        return <Truck className="w-4 h-4" />;
      case 'caminhoneiro':
        return <User className="w-4 h-4" />;
      case 'embarcador':
        return <Package className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  }, []);

  const getUserTypeLabel = useCallback((userType: string) => {
    const labels: Record<string, string> = {
      embarcador: 'Embarcador',
      transportadora: 'Transportadora',
      caminhoneiro: 'Caminhoneiro',
      agenciador: 'Agenciador',
    };
    return labels[userType] || userType;
  }, []);

  // Filtered and searched data
  const filteredChats = useMemo(() => {
    let filtered = chats.filter(chat =>
      (chat.otherUser?.name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Apply tab filter
    if (chatFilter === 'unread') {
      filtered = filtered.filter(chat => (chat.unreadCount?.[user.id] || 0) > 0);
    } else if (chatFilter === 'pinned') {
      filtered = filtered.filter(chat => chat.isPinned);
    }
    
    // Sort: pinned first, then by last message time
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      const timeA = new Date(a.lastMessageTime || 0).getTime();
      const timeB = new Date(b.lastMessageTime || 0).getTime();
      return timeB - timeA;
    });
  }, [chats, searchTerm, chatFilter, user.id]);

  const filteredUsers = useMemo(() => {
    // Mostrar TODOS os usuários disponíveis para conversa
    // (não apenas aqueles sem conversa existente)
    const filtered = users.filter(u =>
      (u.name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    console.log('📋 [ChatScreen] Usuários filtrados para nova conversa:', {
      totalUsers: users.length,
      filtered: filtered.length,
      searchTerm,
      chatsCount: chats.length
    });
    
    return filtered;
  }, [users, searchTerm, chats]);

  const filteredMessages = useMemo(() => {
    if (!messageSearchTerm) return messages;
    
    return messages.filter(msg =>
      (msg.content ?? '').toLowerCase().includes(messageSearchTerm.toLowerCase())
    );
  }, [messages, messageSearchTerm]);

  // Memoize message grouping calculations
  const messagesWithGrouping = useMemo(() => {
    return filteredMessages.map((message, index) => {
      const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
      const nextMessage = index < filteredMessages.length - 1 ? filteredMessages[index + 1] : null;
      
      const isFirstInGroup = !prevMessage || 
        prevMessage.senderId !== message.senderId ||
        (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) > 60000;
      
      const isLastInGroup = !nextMessage || 
        nextMessage.senderId !== message.senderId ||
        (new Date(nextMessage.createdAt).getTime() - new Date(message.createdAt).getTime()) > 60000;
      
      const showDateSeparator = 
        index === 0 || 
        new Date(message.createdAt).toDateString() !== 
        new Date(filteredMessages[index - 1].createdAt).toDateString();
      
      const isLastMessage = index === filteredMessages.length - 1;

      return {
        ...message,
        isFirstInGroup,
        isLastInGroup,
        showDateSeparator,
        isLastMessage,
      };
    });
  }, [filteredMessages]);

  const totalUnreadCount = useMemo(() => {
    return chats.reduce((total, chat) => {
      return total + (chat.unreadCount?.[user.id] || 0);
    }, 0);
  }, [chats, user.id]);

  return (
    <TooltipProvider>
      <div className={`relative flex h-screen bg-background ${isCollaborator ? 'pt-8' : ''}`}>
        {/* ✅ Banner de colaborador */}
        {isCollaborator && (
          <div className="absolute top-0 left-0 right-0 z-20 bg-blue-600 text-white text-xs px-4 py-1.5 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Chat como <strong>{chatDisplayName}</strong> (Colaborador)</span>
          </div>
        )}
        {/* Chats List */}
        <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-border bg-card`}>
          {/* Header */}
          <div className="sticky top-0 z-10 p-4 border-b border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="font-medium">Mensagens</h1>
                {totalUnreadCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {totalUnreadCount} não lida{totalUnreadCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar conversa..."
                onChange={(e) => debouncedSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filter Tabs */}
            <div className="flex gap-2">
              <Button
                variant={chatFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChatFilter('all')}
                className="flex-1 text-xs"
              >
                Todas
                {chats.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 text-xs">
                    {chats.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={chatFilter === 'unread' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChatFilter('unread')}
                className="flex-1 text-xs"
              >
                Não Lidas
                {totalUnreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 text-xs bg-primary text-white">
                    {totalUnreadCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={chatFilter === 'pinned' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChatFilter('pinned')}
                className="flex-1 text-xs"
              >
                <Pin className="w-3 h-3 mr-1" />
                Fixadas
              </Button>
            </div>
          </div>

          {/* New Chat Section */}
          <AnimatePresence>
            {showNewChat && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-border bg-muted overflow-hidden"
              >
                <div className="p-4">
                  <h3 className="text-sm font-medium mb-3">Iniciar nova conversa</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => {
                        const hasExistingChat = chats.some(c => c.participants.includes(u.id));
                        return (
                          <motion.button
                            key={u.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleStartNewChat(u.id)}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-background transition-colors"
                          >
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={getAvatarUrl(u.profile?.avatar) || undefined} />
                              <AvatarFallback>
                                {getUserIcon(u.userType)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-sm">{u.name}</div>
                                {hasExistingChat && (
                                  <Badge variant="secondary" className="text-xs">
                                    <MessageCircle className="w-3 h-3 mr-1" />
                                    Conversa ativa
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{getUserTypeLabel(u.userType)}</div>
                            </div>
                          </motion.button>
                        );
                      })
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário disponível no momento'}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chats List */}
          <div className="flex-1 overflow-y-auto" style={{ overflowAnchor: 'none', scrollBehavior: 'auto' }}>
            {isLoadingChats && chats.length === 0 ? (
              <LoadingSpinner message="Carregando..." />
            ) : filteredChats.length > 0 ? (
              <AnimatePresence>
                {filteredChats.map((chat) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`relative w-full flex items-center gap-3 p-4 border-b border-border hover:bg-muted transition-colors cursor-pointer ${
                      selectedChat?.id === chat.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    {chat.isPinned && (
                      <Pin className="absolute top-2 right-2 w-3 h-3 text-primary" />
                    )}
                    
                    <div className="relative">
                      <Avatar 
                        className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          chat.otherUser && handleViewProfile(chat.otherUser.id);
                        }}
                      >
                        <AvatarImage src={chat.otherUser?.avatar} />
                        <AvatarFallback>
                          {chat.otherUser && getUserIcon(chat.otherUser.userType)}
                        </AvatarFallback>
                      </Avatar>
                      {chat.otherUser?.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium truncate flex items-center gap-2">
                          {chat.otherUser?.name}
                          {chat.isMuted && <Volume2 className="w-3 h-3 text-muted-foreground" />}
                        </h4>
                        {chat.lastMessageTime && (
                          <span className="text-xs text-muted-foreground">
                            {formatChatTime(chat.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {chat.lastMessageText || 'Sem mensagens'}
                        </p>
                        {(chat.unreadCount?.[user.id] || 0) > 0 && !chat.isMuted && (
                          <Badge className="ml-2 bg-primary text-white px-2">
                            {chat.unreadCount[user.id]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Nenhuma conversa</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm ? 'Nenhuma conversa encontrada' : 'Inicie uma nova conversa'}
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => {
                      setShowNewChat(true);
                      // ✅ Carregar usuários apenas ao abrir dialog
                      if (users.length === 0) loadAllUsers();
                    }} 
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Conversa
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages Panel */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col bg-background">
            {/* Chat Header */}
            <div className="sticky top-0 z-10 flex items-center gap-3 p-4 border-b border-border bg-card">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChat(null)}
                className="md:hidden"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              
              <div className="relative">
                <Avatar 
                  className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => selectedChat.otherUser && handleViewProfile(selectedChat.otherUser.id)}
                >
                  <AvatarImage src={selectedChat.otherUser?.avatar} />
                  <AvatarFallback>
                    {selectedChat.otherUser && getUserIcon(selectedChat.otherUser.userType)}
                  </AvatarFallback>
                </Avatar>
                {selectedChat.otherUser?.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                )}
              </div>
              
              <div 
                className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => selectedChat.otherUser && handleViewProfile(selectedChat.otherUser.id)}
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{selectedChat.otherUser?.name}</h3>
                  <Shield className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedChat.otherUser?.isOnline 
                    ? 'Online' 
                    : `Visto ${formatLastSeen(selectedChat.otherUser?.lastSeen)}`
                  }
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowMessageSearch(!showMessageSearch)}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Buscar mensagens</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => selectedChat.otherUser && handleViewProfile(selectedChat.otherUser.id)}
                    >
                      <UserCircle className="w-4 h-4 mr-2" />
                      Ver Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handlePinChat(selectedChat.id, selectedChat.isPinned || false)}
                    >
                      <Pin className="w-4 h-4 mr-2" />
                      {selectedChat.isPinned ? 'Desafixar' : 'Fixar'} Conversa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => confirmDeleteChat(selectedChat)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Conversa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Message Search */}
            <AnimatePresence>
              {showMessageSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-border bg-muted overflow-hidden"
                >
                  <div className="p-3 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Buscar nas mensagens..."
                        value={messageSearchTerm}
                        onChange={(e) => setMessageSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowMessageSearch(false);
                        setMessageSearchTerm('');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pinned Messages */}
            <AnimatePresence>
              {pinnedMessages.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-border bg-blue-50 dark:bg-blue-950/20 overflow-hidden"
                >
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Pin className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Mensagens Fixadas</span>
                    </div>
                    <div className="space-y-1">
                      {pinnedMessages.slice(0, 3).map((msg) => (
                        <div key={msg.id} className="text-sm text-muted-foreground truncate">
                          <span className="font-medium">{msg.senderName}:</span> {msg.content}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-0.5"
            >
              {loadingOlderMessages && (
                <div className="text-center py-2">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              )}

              {isLoadingMessages && messages.length === 0 ? (
                <LoadingSpinner message="Carregando mensagens..." />
              ) : messagesWithGrouping.length > 0 ? (
                <AnimatePresence>
                  {messagesWithGrouping.map((message) => (
                    <ChatMessageItem
                      key={message.id}
                      message={message}
                      user={user}
                      selectedChat={selectedChat}
                      formatMessageTime={formatMessageTime}
                      handleReaction={handleReaction}
                      handleCopyMessage={handleCopyMessage}
                      handlePinMessage={handlePinMessage}
                      handleDeleteMessage={handleDeleteMessage}
                      setReplyingTo={setReplyingTo}
                      setEditingMessage={setEditingMessage}
                      setMessageInput={setMessageInput}
                      setShowReactionPicker={setShowReactionPicker}
                      showReactionPicker={showReactionPicker}
                      viewImage={viewImage}
                      REACTIONS={REACTIONS}
                    />
                  ))}
                </AnimatePresence>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">
                    {messageSearchTerm ? 'Nenhuma mensagem encontrada' : 'Nenhuma mensagem ainda'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {messageSearchTerm 
                      ? 'Tente buscar por outros termos' 
                      : 'Envie a primeira mensagem para iniciar a conversa'
                    }
                  </p>
                </div>
              )}

              {/* Typing Indicator */}
              {otherUserTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <div className="flex gap-1">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                      className="w-2 h-2 bg-muted-foreground rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      className="w-2 h-2 bg-muted-foreground rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                      className="w-2 h-2 bg-muted-foreground rounded-full"
                    />
                  </div>
                  <span className="text-xs">digitando...</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to Bottom Button */}
            <AnimatePresence>
              {showScrollButton && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  className="absolute bottom-24 right-8 z-10"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        onClick={() => {
                          setAutoScroll(true);
                          setShowScrollButton(false);
                          scrollToBottom('smooth');
                        }}
                        className="rounded-full shadow-lg h-12 w-12 bg-primary hover:bg-primary/90 relative"
                      >
                        <ArrowLeft className="w-5 h-5 rotate-[-90deg] text-white" />
                        {unreadMessagesBelow > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                            {unreadMessagesBelow > 9 ? '9+' : unreadMessagesBelow}
                          </Badge>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ir para mensagens recentes</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message Input */}
            <div className="sticky bottom-0 p-4 border-t border-border bg-card z-10 mt-auto">
              {/* Reply Preview */}
              <AnimatePresence>
                {replyingTo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3 p-3 bg-muted rounded-lg flex items-start gap-2"
                  >
                    <Reply className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{replyingTo.senderName}</div>
                      <div className="text-xs text-muted-foreground truncate">{replyingTo.content}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(null)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Edit Preview */}
              <AnimatePresence>
                {editingMessage && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg flex items-start gap-2"
                  >
                    <Edit2 className="w-4 h-4 mt-0.5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-primary">Editando mensagem</div>
                      <div className="text-xs text-muted-foreground truncate">{editingMessage.content}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingMessage(null);
                        setMessageInput('');
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Media Preview */}
              <AnimatePresence>
                {mediaFiles.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3 p-3 bg-muted rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {mediaFiles.length} arquivo(s) selecionado(s)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMediaFiles([])}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mediaFiles.map((file) => (
                        <div key={file.id} className="relative group">
                          {file.type === 'image' ? (
                            <img
                              src={file.preview}
                              alt={file.name}
                              className="w-16 h-16 object-cover rounded-lg border border-border"
                            />
                          ) : (
                            <div className="w-16 h-16 flex items-center justify-center bg-background rounded-lg border border-border">
                              <FileText className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Replies */}
              <AnimatePresence>
                {showQuickReplies && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Respostas Rápidas</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowQuickReplies(false)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {quickReplies.map((reply) => (
                        <Button
                          key={reply.id}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMessageInput(reply.text);
                            setShowQuickReplies(false);
                          }}
                          className="justify-start text-left text-xs h-auto py-2"
                        >
                          <span className="mr-2">{reply.icon}</span>
                          <span className="truncate">{reply.text}</span>
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (mediaFiles.length > 0) {
                    handleSendMessage(true);
                  } else {
                    handleSendMessage();
                  }
                }}
                className="flex items-end gap-2"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      disabled={sendingMessage}
                      className={showQuickReplies ? 'bg-muted' : ''}
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Respostas rápidas</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMediaDialog(true)}
                      disabled={sendingMessage}
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Anexar arquivo</p>
                  </TooltipContent>
                </Tooltip>
                
                <div className="flex-1 relative">
                  <Input
                    placeholder={editingMessage ? "Editar mensagem..." : "Digite uma mensagem..."}
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      handleTyping();
                    }}
                    disabled={sendingMessage}
                    maxLength={2000}
                    className="resize-none pr-16"
                  />
                  {messageInput.length > 0 && (
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                      messageInput.length > 1800 ? 'text-orange-500' : 
                      messageInput.length > 1900 ? 'text-red-500' : 
                      'text-muted-foreground'
                    }`}>
                      {messageInput.length}/2000
                    </div>
                  )}
                </div>
                
                <Button
                  type="submit"
                  disabled={(!messageInput.trim() && mediaFiles.length === 0) || sendingMessage}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {sendingMessage ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>

            {/* Media Upload Dialog */}
            <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Anexar Mídia</DialogTitle>
                  <DialogDescription>
                    Selecione imagens ou documentos para anexar à mensagem
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <MediaUpload
                    onFilesChange={setMediaFiles}
                    maxFiles={10}
                    maxSizePerFile={10}
                    acceptedTypes={['image/*', 'application/pdf', '.doc', '.docx']}
                    mode="full"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowMediaDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      setShowMediaDialog(false);
                      if (mediaFiles.length > 0) {
                        setTimeout(() => {
                          document.querySelector<HTMLInputElement>('input[placeholder*="mensagem"]')?.focus();
                        }, 100);
                      }
                    }}
                    disabled={mediaFiles.length === 0}
                  >
                    Anexar ({mediaFiles.length})
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Image Viewer */}
            <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Visualizar Imagem</DialogTitle>
                  <DialogDescription>
                    Clique no botão de download para salvar a imagem
                  </DialogDescription>
                </DialogHeader>
                {selectedImage && (
                  <div className="relative">
                    <img
                      src={selectedImage}
                      alt="Imagem"
                      className="w-full rounded-lg"
                    />
                    <a
                      href={selectedImage}
                      download="imagem.jpg"
                      className="absolute top-2 right-2 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-background">
            <div className="text-center">
              <MessageCircle className="w-24 h-24 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-medium mb-2">Selecione uma conversa</h2>
              <p className="text-sm text-muted-foreground">
                Escolha uma conversa da lista ou inicie uma nova
              </p>
            </div>
          </div>
        )}

        {/* User Profile Sheet */}
        <UnifiedUserProfileSheet
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
          profile={selectedUserProfile}
          showContactButton={true}
        />

        {/* Delete Chat Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Conversa</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta conversa com{' '}
                <span className="font-medium">{chatToDelete?.otherUser?.name}</span>?
                <br />
                <br />
                Esta ação não pode ser desfeita. Todas as mensagens serão permanentemente removidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setChatToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteChat}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
