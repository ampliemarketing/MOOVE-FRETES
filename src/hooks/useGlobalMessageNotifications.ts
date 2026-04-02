import { useEffect } from 'react';
import { getSupabaseClient } from '../utils/supabase/client';
import { createNotification } from '../utils/notification-manager';

/**
 * Hook global para detectar novas mensagens e criar notificações automaticamente.
 */
export function useGlobalMessageNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) {
      return;
    }

    let channel: ReturnType<ReturnType<typeof getSupabaseClient>['channel']> | null = null;
    let isActive = true;

    const setupListener = async () => {
      try {
        const supabase = getSupabaseClient();

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.log('⚠️ [Global Notifications] Sem sessão ativa - notificações realtime desabilitadas');
          return;
        }

        console.log('🌍 [Global Notifications] Ativando listener para usuário:', userId);

        channel = supabase
          .channel('global_message_notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
            },
            async (payload) => {
              if (!isActive) return;

              const newMessage = payload.new as any;

              if (newMessage.sender_id === userId) {
                return;
              }

              console.log('🔔 [Global Notifications] Nova mensagem de:', newMessage.sender_id);

              const { data: senderData } = await supabase
                .from('profiles')
                .select('name, avatar_url')
                .eq('id', newMessage.sender_id)
                .single();

              const senderName = senderData?.name || 'Usuário';

              const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const notification = {
                id: notificationId,
                type: 'message',
                title: `Nova mensagem de ${senderName}`,
                message: newMessage.content || 'Enviou uma mensagem',
                userId: userId,
                relatedId: newMessage.conversation_id,
                relatedType: 'conversation',
                isRead: false,
                createdAt: new Date().toISOString(),
                metadata: {
                  senderId: newMessage.sender_id,
                  senderName: senderName,
                  senderAvatar: senderData?.avatar_url,
                  messageId: newMessage.id,
                  conversationId: newMessage.conversation_id,
                },
              };

              try {
                const { database } = await import('../utils/database');
                const createResult = await database.notifications.create(notification);

                if (createResult.success) {
                  console.log('📬 [Global Notifications] Notificação criada');
                }
              } catch (error) {
                console.error('❌ [Global Notifications] Erro ao salvar:', error);
              }

              if (typeof window !== 'undefined' && window.dispatchEvent) {
                try {
                  window.dispatchEvent(new CustomEvent('notification-created', {
                    detail: notification
                  }));
                } catch (error) {
                  console.error('❌ [Global Notifications] Erro ao disparar evento:', error);
                }
              }
            }
          )
          .subscribe((status) => {
            if (status === 'CLOSED') {
              return;
            }

            if (status === 'SUBSCRIBED') {
              console.log('✅ [Global Notifications] Notificações ativadas');
            } else if (status === 'CHANNEL_ERROR') {
              console.warn('⚠️ [Global Notifications] Erro no canal - verifique políticas RLS');
            }
          });
      } catch (error) {
        console.warn('⚠️ [Global Notifications] Não foi possível ativar notificações:', error);
      }
    };

    setupListener();

    return () => {
      isActive = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [userId]);
}
