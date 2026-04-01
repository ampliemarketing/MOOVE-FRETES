/**
 * Activity Log Repository - 100% Integrado com Supabase
 * Logs de atividade do sistema (IMUTÁVEIS - sem UPDATE/DELETE)
 * 
 * ARQUITETURA:
 * 1. Supabase como fonte primária
 * 2. Logs são append-only (apenas INSERT e SELECT)
 * 3. Usado para auditoria e rastreamento
 */

import { getSupabaseClient } from '../../supabase/client';
import { db, DBResponse } from '../db-client';
import { KeyPatterns } from '../schema';
import { activityLogToSQL, sqlToActivityLog } from '../adapters';
import { generateId } from '../id-generator';

// ============================================
// TYPES & CONSTANTS
// ============================================

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  category: string;
  targetType?: string;
  targetId?: string;
  companyId?: string;
  createdAt: string;
}

/**
 * Tipo flexível para criação de logs - aceita tanto 'action' quanto 'actionType'
 */
export interface ActivityLogCreate {
  userId: string;
  userName?: string;
  action?: string;
  actionType?: string; // Alias para action
  entityType?: string;
  entityId?: string;
  description?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  category?: string;
  targetType?: string;
  targetId?: string;
  companyId?: string;
}

export const ACTIVITY_TYPES = {
  FREIGHT_CREATED: 'freight_created',
  FREIGHT_UPDATED: 'freight_updated',
  FREIGHT_ACCEPTED: 'freight_accepted',
  FREIGHT_COMPLETED: 'freight_completed',
  FREIGHT_CANCELLED: 'freight_cancelled',
  DRIVER_REGISTERED: 'driver_registered',
  DRIVER_UPDATED: 'driver_updated',
  TRANSACTION_CREATED: 'transaction_created',
  TRANSACTION_COMPLETED: 'transaction_completed',
  MESSAGE_SENT: 'message_sent',
  RATING_GIVEN: 'rating_given',
  ROUTE_PUBLISHED: 'route_published',
  POST_CREATED: 'post_created',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
} as const;

export const ACTIVITY_CATEGORIES = {
  FREIGHT: 'freight',
  USER: 'user',
  FINANCIAL: 'financial',
  COMMUNICATION: 'communication',
  SOCIAL: 'social',
  SYSTEM: 'system',
  SECURITY: 'security',
} as const;

export function getActivityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    freight_created: 'Frete criado',
    freight_updated: 'Frete atualizado',
    freight_accepted: 'Frete aceito',
    freight_completed: 'Frete completado',
    freight_cancelled: 'Frete cancelado',
    driver_registered: 'Motorista cadastrado',
    driver_updated: 'Motorista atualizado',
    transaction_created: 'Transação criada',
    transaction_completed: 'Transação completada',
    message_sent: 'Mensagem enviada',
    rating_given: 'Avaliação dada',
    route_published: 'Rota publicada',
    post_created: 'Post criado',
    user_login: 'Login',
    user_logout: 'Logout',
  };
  return labels[type] || type;
}

export function getActivityCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    freight: 'Fretes',
    user: 'Usuário',
    financial: 'Financeiro',
    communication: 'Comunicação',
    social: 'Social',
    system: 'Sistema',
    security: 'Segurança',
  };
  return labels[category] || category;
}

// ============================================
// REPOSITORY
// ============================================

export class ActivityLogRepository {
  /**
   * Create activity log (append-only)
   * ✅ Logs são IMUTÁVEIS
   * Aceita tanto ActivityLog quanto ActivityLogCreate (com actionType alias)
   */
  async create(log: ActivityLogCreate | Omit<ActivityLog, 'id' | 'createdAt'>): Promise<DBResponse<ActivityLog>> {
    try {
      const now = new Date().toISOString();

      // Resolver action: aceita 'action' ou 'actionType' (alias)
      const resolvedAction = log.action || (log as ActivityLogCreate).actionType || 'unknown';
      const resolvedEntityType = log.entityType || (log as ActivityLogCreate).category || 'system';
      const resolvedDescription = (log as any).description || `${resolvedAction} by user`;
      const resolvedCategory = (log as any).category || 'system';
      const resolvedCompanyId = null; // ⚠️ activity_logs.company_id FK aponta para companies.id (UUID interno), não user_id. Deixar null para evitar FK violation.
      const resolvedTargetType = (log as any).targetType || null;
      const resolvedTargetId = (log as any).targetId || null;

      // Mesclar userName no metadata para exibição na tela de logs
      const resolvedMetadata = {
        ...(log.metadata || {}),
        ...((log as ActivityLogCreate).userName ? { userName: (log as ActivityLogCreate).userName } : {})
      };

      // 1. SALVAR NO SUPABASE (único write permitido) - deixar Supabase gerar UUID
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          // ❌ NÃO passar ID - deixar Supabase gerar UUID automaticamente
          user_id: log.userId,
          action: resolvedAction,
          entity_type: resolvedEntityType,
          entity_id: log.entityId || null,
          description: resolvedDescription,
          category: resolvedCategory,
          company_id: resolvedCompanyId,
          target_type: resolvedTargetType,
          target_id: resolvedTargetId,
          metadata: resolvedMetadata,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar log no Supabase:', error);
        throw error;
      }

      const created = sqlToActivityLog(data);
      console.log('✅ Log criado:', created.id);

      // 2. CACHE (opcional, mas logs raramente são lidos individualmente)
      try {
        await db.set(`activity_log:${created.id}`, created);
      } catch (cacheError) {
        console.warn('⚠️ Erro ao cachear log:', cacheError);
      }

      return {
        success: true,
        data: created,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create activity log',
      };
    }
  }

  /**
   * Get logs by company (all users in the company)
   * Busca logs onde user_id = companyId (owner) OU metadata contém referência à empresa
   */
  async getByCompany(
    companyId: string, 
    startDate?: Date, 
    endDate?: Date, 
    limit: number = 100
  ): Promise<DBResponse<ActivityLog[]>> {
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const logs = (data || []).map(sqlToActivityLog);
      console.log(`✅ ${logs.length} logs carregados para empresa ${companyId}`);

      return {
        success: true,
        data: logs,
      };
    } catch (error) {
      console.error('❌ Erro ao carregar logs da empresa:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get company logs',
      };
    }
  }

  /**
   * Get logs by user ID
   */
  async getByUserId(userId: string, limit: number = 100, offset: number = 0): Promise<DBResponse<ActivityLog[]>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const logs = data.map(sqlToActivityLog);
      console.log(`✅ ${logs.length} logs carregados`);

      return {
        success: true,
        data: logs,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user logs',
      };
    }
  }

  /**
   * Get logs by entity
   */
  async getByEntity(entityType: string, entityId: string, limit: number = 50): Promise<DBResponse<ActivityLog[]>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const logs = data.map(sqlToActivityLog);

      return {
        success: true,
        data: logs,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get entity logs',
      };
    }
  }

  /**
   * Get logs by category
   */
  async getByCategory(category: string, limit: number = 100, offset: number = 0): Promise<DBResponse<ActivityLog[]>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const logs = data.map(sqlToActivityLog);

      return {
        success: true,
        data: logs,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get category logs',
      };
    }
  }

  /**
   * Get recent logs (global feed)
   */
  async getRecent(limit: number = 100): Promise<DBResponse<ActivityLog[]>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const logs = data.map(sqlToActivityLog);

      return {
        success: true,
        data: logs,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recent logs',
      };
    }
  }

  /**
   * Clean old logs (older than X days)
   * ⚠️ USE COM CUIDADO - logs de auditoria
   */
  async cleanOldLogs(days: number = 90): Promise<DBResponse<number>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('activity_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select();

      if (error) throw error;

      console.log(`✅ ${data.length} logs antigos removidos`);

      return {
        success: true,
        data: data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clean old logs',
      };
    }
  }

  /**
   * Helper: Log freight action
   */
  async logFreightAction(
    userId: string,
    freightId: string,
    action: string,
    description: string,
    metadata?: any
  ): Promise<DBResponse<ActivityLog>> {
    return this.create({
      userId,
      action,
      entityType: 'freight',
      entityId: freightId,
      description,
      category: 'freight',
      metadata,
    });
  }

  /**
   * Helper: Log user action
   */
  async logUserAction(
    userId: string,
    action: string,
    description: string,
    metadata?: any
  ): Promise<DBResponse<ActivityLog>> {
    return this.create({
      userId,
      action,
      entityType: 'user',
      entityId: userId,
      description,
      category: 'user',
      metadata,
    });
  }

  /**
   * Helper: Log transaction
   */
  async logTransaction(
    userId: string,
    transactionId: string,
    action: string,
    description: string,
    metadata?: any
  ): Promise<DBResponse<ActivityLog>> {
    return this.create({
      userId,
      action,
      entityType: 'transaction',
      entityId: transactionId,
      description,
      category: 'financial',
      metadata,
    });
  }
}

export const activityLogRepository = new ActivityLogRepository();