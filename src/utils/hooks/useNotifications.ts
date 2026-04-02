/**
 * Custom hook for notifications
 * ✅ Integrado com Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { database } from '../database';
import { getSupabaseClient } from '../supabase/client';

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'quote' | 'freight' | 'social';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: any;
  createdAt: string;
}

export function useNotifications(overrideUserId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      console.log('🔔 Carregando notificações...');
      setLoading(true);
      setError(null);
      
      // 🔍 TENTAR CARREGAR DO SUPABASE PRIMEIRO
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ Usuário autenticado, carregando do Supabase...');
          
          // ✅ Usar overrideUserId (companyId) se disponível, senão session.user.id
          const targetUserId = overrideUserId || session.user.id;
          const response = await database.notifications.getByUserId(targetUserId);
          
          if (response.success && response.data) {
            console.log('✅ Notificações carregadas do Supabase:', response.data.length);
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.read).length);
            setLoading(false);
            return;
          }
        }
      } catch (supabaseErr) {
        console.warn('⚠️ Erro ao carregar do Supabase, tentando LocalStorage:', supabaseErr);
      }
      
      // 📦 FALLBACK: Carregar do LocalStorage
      const currentUserStr = localStorage.getItem('maisfrete:currentUser');
      if (!currentUserStr) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      
      const currentUser = JSON.parse(currentUserStr);
      
      // Carregar do LocalStorage (database)
      const response = await database.notifications.getByUserId(currentUser.id);
      
      if (response.success && response.data) {
        console.log('✅ Notificações carregadas do LocalStorage:', response.data.length);
        setNotifications(response.data);
        setUnreadCount(response.data.filter(n => !n.read).length);
      } else {
        console.log('⚠️ Nenhuma notificação encontrada');
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      // Silent fail - notifications are optional and errors should not be visible
      console.log('⚠️ Erro ao carregar notificações (silencioso):', err);
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [overrideUserId]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));

      await database.notifications.markAsRead(id);
    } catch (err) {
      // Revert on error silently
      await loadNotifications();
    }
  }, [loadNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      // Mark all as read in parallel
      await Promise.all(unreadIds.map(id => database.notifications.markAsRead(id)));
    } catch (err) {
      // Revert on error silently
      await loadNotifications();
    }
  }, [notifications, loadNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  };
}