/**
 * useUserPreferences Hook
 * React hook para gerenciar preferências do usuário com Supabase
 */

import { useState, useEffect } from 'react';
import { preferencesRepository, type UserPreferences } from '../database/repositories/preferences-repository';
import { toast } from 'sonner@2.0.3';

export function useUserPreferences(userId: string | undefined) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar preferências
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await preferencesRepository.getByUserId(userId);
      
      if (response.success && response.data) {
        setPreferences(response.data);
      } else {
        setError(response.error || 'Erro ao carregar preferências');
      }
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar preferências
  const updatePreferences = async (
    updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const response = await preferencesRepository.update(userId, updates);
      
      if (response.success && response.data) {
        setPreferences(response.data);
        toast.success('Preferências atualizadas com sucesso');
        return true;
      } else {
        toast.error(response.error || 'Erro ao atualizar preferências');
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar preferências');
      return false;
    }
  };

  // Alternar notificações
  const toggleNotification = async (
    setting: keyof Pick<UserPreferences, 'notifications_enabled' | 'email_alerts' | 'sms_alerts' | 'push_notifications' | 'freight_alerts' | 'chat_notifications' | 'marketing_emails'>
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const response = await preferencesRepository.toggleNotification(userId, setting);
      
      if (response.success && response.data) {
        setPreferences(response.data);
        return true;
      } else {
        toast.error(response.error || 'Erro ao alternar notificação');
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alternar notificação');
      return false;
    }
  };

  // Atualizar tema
  const updateTheme = async (theme: 'light' | 'dark' | 'auto'): Promise<boolean> => {
    if (!userId) return false;

    try {
      const response = await preferencesRepository.updateTheme(userId, theme);
      
      if (response.success && response.data) {
        setPreferences(response.data);
        
        // Aplicar tema imediatamente
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // Auto - detectar preferência do sistema
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', prefersDark);
        }
        
        return true;
      } else {
        toast.error(response.error || 'Erro ao atualizar tema');
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar tema');
      return false;
    }
  };

  // Atualizar idioma
  const updateLanguage = async (language: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const response = await preferencesRepository.updateLanguage(userId, language);
      
      if (response.success && response.data) {
        setPreferences(response.data);
        toast.success('Idioma atualizado');
        return true;
      } else {
        toast.error(response.error || 'Erro ao atualizar idioma');
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar idioma');
      return false;
    }
  };

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    toggleNotification,
    updateTheme,
    updateLanguage,
    refresh: loadPreferences,
  };
}
