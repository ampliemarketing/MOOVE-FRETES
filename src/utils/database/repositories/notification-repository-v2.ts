/**
 * Notification Repository - 100% Integrado com Supabase
 * Seguindo padrão do DriverRepository
 * 
 * ARQUITETURA:
 * 1. Supabase como fonte primária
 * 2. LocalStorage como cache opcional
 * 3. Adapters para conversão de dados
 */

import { getSupabaseClient } from '../../supabase/client';
import { db, DBResponse } from '../db-client';
import { Notification, KeyPatterns, PaginationParams } from '../schema';
import { notificationToSQL, sqlToNotification } from '../adapters';
import { generateId } from '../id-generator';

export class NotificationRepository {
  /**
   * Create a new notification
   * ✅ SALVA NO SUPABASE PRIMEIRO, depois cacheia
   */
  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<DBResponse<Notification>> {
    try {
      const now = new Date().toISOString();
      
      // 1. SALVAR NO SUPABASE (fonte primária) - deixar Supabase gerar UUID
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          // ❌ NÃO passar ID - deixar Supabase gerar UUID automaticamente
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          icon: notification.icon || null,
          action_url: notification.actionUrl || null,
          is_read: notification.read || false,
          read_at: notification.readAt || null,
          created_at: now,
          metadata: notification.metadata || {},
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar notificação no Supabase:', error);
        throw error;
      }

      const created = sqlToNotification(data);
      console.log('✅ Notificação criada no Supabase:', created.id);

      // 2. CACHEAR NO LOCALSTORAGE (opcional)
      try {
        await db.set(KeyPatterns.notification(created.id), created);
        
        // Add to user's notifications list (cache)
        const userKey = KeyPatterns.notificationsByUser(notification.userId);
        const userResponse = await db.get<string[]>(userKey);
        const userNotifications = userResponse.data || [];
        userNotifications.unshift(created.id);
        await db.set(userKey, userNotifications);
      } catch (cacheError) {
        console.warn('⚠️ Erro ao cachear notificação:', cacheError);
        // Não falhar se cache falhar
      }

      return {
        success: true,
        data: created,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create notification',
      };
    }
  }

  /**
   * Get notification by ID
   * ✅ Busca no cache primeiro, depois Supabase
   */
  async getById(id: string): Promise<DBResponse<Notification>> {
    try {
      // 1. Tentar cache local
      const cacheResponse = await db.get<Notification>(KeyPatterns.notification(id));
      if (cacheResponse.success && cacheResponse.data) {
        return cacheResponse;
      }

      // 2. Buscar do Supabase
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const notification = sqlToNotification(data);
      
      // Cachear para próximas consultas
      await db.set(KeyPatterns.notification(id), notification);

      return {
        success: true,
        data: notification,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification',
      };
    }
  }

  /**
   * Get all notifications for a user
   * ✅ BUSCA DO SUPABASE (fonte primária)
   */
  async getByUserId(userId: string, params?: Partial<PaginationParams>): Promise<DBResponse<Notification[]>> {
    try {
      const { limit = 50, offset = 0 } = params || {};

      // 1. BUSCAR DO SUPABASE
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Erro ao buscar notificações do Supabase:', error);
        throw error;
      }

      const notifications = data.map(sqlToNotification);
      console.log(`✅ ${notifications.length} notificações carregadas do Supabase`);

      // 2. ATUALIZAR CACHE (opcional)
      try {
        const notificationIds: string[] = [];
        for (const notification of notifications) {
          await db.set(KeyPatterns.notification(notification.id), notification);
          notificationIds.push(notification.id);
        }
        await db.set(KeyPatterns.notificationsByUser(userId), notificationIds);
      } catch (cacheError) {
        console.warn('⚠️ Erro ao cachear notificações:', cacheError);
      }

      return {
        success: true,
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user notifications',
      };
    }
  }

  /**
   * Alias for getByUserId (backward compatibility)
   */
  async getByUser(userId: string, params?: Partial<PaginationParams>): Promise<DBResponse<Notification[]>> {
    return this.getByUserId(userId, params);
  }

  /**
   * Mark notification as read
   * ✅ ATUALIZA NO SUPABASE PRIMEIRO
   */
  async markAsRead(id: string): Promise<DBResponse<Notification>> {
    try {
      const now = new Date().toISOString();

      // 1. ATUALIZAR NO SUPABASE
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: now,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updated = sqlToNotification(data);

      // 2. ATUALIZAR CACHE
      try {
        await db.set(KeyPatterns.notification(id), updated);
      } catch (cacheError) {
        console.warn('⚠️ Erro ao atualizar cache:', cacheError);
      }

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark notification as read',
      };
    }
  }

  /**
   * Mark all notifications as read for a user
   * ✅ ATUALIZA NO SUPABASE
   */
  async markAllAsRead(userId: string): Promise<DBResponse<boolean>> {
    try {
      const now = new Date().toISOString();

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: now,
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      // Limpar cache de notificações do usuário
      await db.del(KeyPatterns.notificationsByUser(userId));

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark all as read',
      };
    }
  }

  /**
   * Delete notification
   * ✅ DELETA DO SUPABASE PRIMEIRO
   */
  async delete(id: string): Promise<DBResponse<boolean>> {
    try {
      // 1. DELETAR DO SUPABASE
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // 2. LIMPAR CACHE
      await db.del(KeyPatterns.notification(id));

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete notification',
      };
    }
  }

  /**
   * Get unread count for a user
   * ✅ BUSCA DO SUPABASE
   */
  async getUnreadCount(userId: string): Promise<DBResponse<number>> {
    try {
      const supabase = getSupabaseClient();
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
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
   * Delete old notifications (cleanup)
   * ✅ DELETA DO SUPABASE
   */
  async deleteOlderThan(userId: string, days: number): Promise<DBResponse<boolean>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;

      // Limpar cache
      await db.del(KeyPatterns.notificationsByUser(userId));

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete old notifications',
      };
    }
  }
}

export const notificationRepository = new NotificationRepository();