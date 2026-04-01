/**
 * User Preferences Repository - 100% Integrado com Supabase
 * Preferências e configurações do usuário
 * 
 * ARQUITETURA:
 * 1. Supabase como fonte primária
 * 2. Pattern getOrCreate (cria se não existir)
 * 3. Cache local para performance
 */

import { getSupabaseClient } from '../../supabase/client';
import { db, DBResponse } from '../db-client';
import { KeyPatterns } from '../schema';
import { userPreferencesToSQL, sqlToUserPreferences } from '../adapters';
import { generateId } from '../id-generator';

interface UserPreferences {
  id: string;
  userId: string;
  notificationsEnabled: boolean;
  emailAlerts: boolean;
  smsAlerts: boolean;
  pushNotifications: boolean;
  freightAlerts: boolean;
  chatNotifications: boolean;
  marketingEmails: boolean;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  distanceUnit: 'km' | 'mi';
  currency: 'BRL' | 'USD';
  notificationSettings?: any;
  privacySettings?: any;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  notificationsEnabled: true,
  emailAlerts: true,
  smsAlerts: false,
  pushNotifications: true,
  freightAlerts: true,
  chatNotifications: true,
  marketingEmails: false,
  language: 'pt-BR',
  theme: 'light',
  distanceUnit: 'km',
  currency: 'BRL',
};

export class PreferencesRepository {
  /**
   * Get or create user preferences
   * ✅ Pattern getOrCreate - garante que sempre existe
   */
  async getOrCreate(userId: string): Promise<DBResponse<UserPreferences>> {
    try {
      // 1. Tentar buscar existente
      const supabase = getSupabaseClient();
      const { data: existing, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const preferences = sqlToUserPreferences(existing);
        await db.set(KeyPatterns.preferences(userId), preferences);
        return { success: true, data: preferences };
      }

      // 2. Criar com valores padrão - deixar Supabase gerar UUID
      const now = new Date().toISOString();

      const sqlData = userPreferencesToSQL({
        ...DEFAULT_PREFERENCES,
        userId,
        createdAt: now,
        updatedAt: now,
      } as any); // Cast porque userPreferencesToSQL espera id

      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          // ❌ NÃO passar ID - deixar Supabase gerar UUID automaticamente
          user_id: userId,
          language: DEFAULT_PREFERENCES.language,
          theme: DEFAULT_PREFERENCES.theme,
          notifications_enabled: DEFAULT_PREFERENCES.notificationsEnabled,
          email_notifications: DEFAULT_PREFERENCES.emailNotifications,
          push_notifications: DEFAULT_PREFERENCES.pushNotifications,
          sms_notifications: DEFAULT_PREFERENCES.smsNotifications,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      const created = sqlToUserPreferences(data);
      console.log('✅ Preferências criadas:', created.id);

      await db.set(KeyPatterns.preferences(userId), created);

      return {
        success: true,
        data: created,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get or create preferences',
      };
    }
  }

  /**
   * Get preferences by user ID
   */
  async getByUserId(userId: string): Promise<DBResponse<UserPreferences>> {
    try {
      // 1. Cache
      const cached = await db.get<UserPreferences>(KeyPatterns.preferences(userId));
      if (cached.success && cached.data) {
        return cached;
      }

      // 2. Supabase
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Se não encontrar, criar com padrões
        if (error.code === 'PGRST116') {
          return this.getOrCreate(userId);
        }
        throw error;
      }

      const preferences = sqlToUserPreferences(data);
      await db.set(KeyPatterns.preferences(userId), preferences);

      return {
        success: true,
        data: preferences,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get preferences',
      };
    }
  }

  /**
   * Update preferences
   */
  async update(userId: string, updates: Partial<UserPreferences>): Promise<DBResponse<UserPreferences>> {
    try {
      const now = new Date().toISOString();

      const supabase = getSupabaseClient();
      
      // Get current preferences
      const { data: current } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!current) {
        // Create if doesn't exist
        return this.getOrCreate(userId);
      }

      const currentPrefs = sqlToUserPreferences(current);
      const updated = { ...currentPrefs, ...updates, updatedAt: now };
      const sqlData = userPreferencesToSQL(updated);

      const { data, error } = await supabase
        .from('user_preferences')
        .update(sqlData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      const result = sqlToUserPreferences(data);
      await db.set(KeyPatterns.preferences(userId), result);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update preferences',
      };
    }
  }

  /**
   * Update notification settings
   */
  async updateNotifications(
    userId: string,
    settings: {
      notificationsEnabled?: boolean;
      emailAlerts?: boolean;
      smsAlerts?: boolean;
      pushNotifications?: boolean;
      freightAlerts?: boolean;
      chatNotifications?: boolean;
    }
  ): Promise<DBResponse<UserPreferences>> {
    return this.update(userId, settings);
  }

  /**
   * Update theme
   */
  async updateTheme(userId: string, theme: 'light' | 'dark' | 'auto'): Promise<DBResponse<UserPreferences>> {
    return this.update(userId, { theme });
  }

  /**
   * Update language
   */
  async updateLanguage(userId: string, language: string): Promise<DBResponse<UserPreferences>> {
    return this.update(userId, { language });
  }

  /**
   * Reset to defaults
   */
  async resetToDefaults(userId: string): Promise<DBResponse<UserPreferences>> {
    try {
      const now = new Date().toISOString();

      const supabase = getSupabaseClient();
      
      // ✅ Usar UPSERT - Supabase irá usar o UUID existente ou criar novo
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          language: DEFAULT_PREFERENCES.language,
          theme: DEFAULT_PREFERENCES.theme,
          notifications_enabled: DEFAULT_PREFERENCES.notificationsEnabled,
          email_notifications: DEFAULT_PREFERENCES.emailNotifications,
          push_notifications: DEFAULT_PREFERENCES.pushNotifications,
          sms_notifications: DEFAULT_PREFERENCES.smsNotifications,
          updated_at: now,
        }, { 
          onConflict: 'user_id' 
        })
        .select()
        .single();

      if (error) throw error;

      const result = sqlToUserPreferences(data);
      await db.set(KeyPatterns.preferences(userId), result);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset preferences',
      };
    }
  }

  /**
   * Delete preferences
   */
  async delete(userId: string): Promise<DBResponse<boolean>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      await db.remove(KeyPatterns.preferences(userId));

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete preferences',
      };
    }
  }
}

export const preferencesRepository = new PreferencesRepository();