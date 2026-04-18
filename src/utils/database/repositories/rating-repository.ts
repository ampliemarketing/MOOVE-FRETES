import { supabase } from '../../supabase-client';
import { getSupabaseClient } from '../../supabase/client';
import type { Rating, DatabaseResponse } from '../schema';

/**
 * CONFIGURAÇÃO: Desabilitar Supabase para ratings
 * Motivo: Trigger 'trigger_update_profile_rating' causa erro "relation 'users' does not exist"
 * Solução: Usar apenas LocalStorage até que a migração SQL seja aplicada
 */
const DISABLE_SUPABASE_RATINGS = false; // ✅ Habilitado para salvar no Supabase

export class RatingRepository {
  /**
   * Get Supabase client safely
   */
  private getClient() {
    // Se Supabase está desabilitado para ratings, retornar null
    if (DISABLE_SUPABASE_RATINGS) {
      return null;
    }
    
    try {
      return getSupabaseClient();
    } catch (error) {
      console.error('Erro ao obter cliente Supabase:', error);
      return null;
    }
  }

  /**
   * Detectar qual schema está sendo usado (antigo ou novo)
   * Cache para não fazer múltiplas verificações
   */
  private schemaVersion: 'old' | 'new' | null = null;

  /**
   * Verificar versão do schema da tabela ratings
   */
  private async detectSchemaVersion(): Promise<'old' | 'new'> {
    if (this.schemaVersion) {
      return this.schemaVersion;
    }

    try {
      const supabase = this.getClient();
      if (!supabase) return 'old';

      // Tentar query com nome novo
      const { error } = await supabase
        .from('ratings')
        .select('evaluator_id')
        .limit(0);

      if (error && error.code === '42703') {
        // Coluna não existe, schema antigo
        this.schemaVersion = 'old';
        // [REVISAR] console.log('📊 Detectado schema ANTIGO de ratings (rater_id, rated_id, rating)');
      } else {
        // Coluna existe, schema novo
        this.schemaVersion = 'new';
        // [REVISAR] console.log('📊 Detectado schema NOVO de ratings (evaluator_id, target_id, overall_rating)');
      }

      return this.schemaVersion;
    } catch (error) {
      console.error('Erro ao detectar versão do schema:', error);
      return 'old'; // Fallback para antigo
    }
  }

  /**
   * Get column names based on schema version
   */
  private async getColumnNames() {
    const version = await this.detectSchemaVersion();
    
    if (version === 'new') {
      return {
        evaluatorId: 'evaluator_id',
        targetId: 'target_id',
        rating: 'overall_rating'
      };
    } else {
      return {
        evaluatorId: 'rater_id',
        targetId: 'rated_id',
        rating: 'rating'
      };
    }
  }

  /**
   * Criar nova avaliação
   */
  async create(rating: Omit<Rating, 'id' | 'createdAt'>): Promise<DatabaseResponse<Rating>> {
    try {
      const supabase = this.getClient();
      if (!supabase) {
        // Salvar apenas no LocalStorage
        return this.createLocalOnly(rating);
      }

      // Verificar se já existe avaliação para este frete/target/evaluator (com tratamento de erro)
      try {
        const existingCheck = await supabase
          .from('ratings')
          .select('id')
          .eq('freight_id', rating.freightId)
          .eq('target_id', rating.targetId)
          .eq('evaluator_id', rating.evaluatorId)
          .maybeSingle();

        if (existingCheck.data) {
          return {
            success: false,
            error: 'Você já avaliou este usuário para este frete'
          };
        }
      } catch (checkError: any) {
        // Se falhar a verificação, continuar com inserção (melhor duplicar que perder dado)
      }

      // Preparar dados - usando nomes de colunas NOVOS após migração
      const newRating: any = {
        freight_id: rating.freightId,
        evaluator_id: rating.evaluatorId,
        evaluator_name: rating.evaluatorName,
        evaluator_type: rating.evaluatorType,
        target_id: rating.targetId,
        target_name: rating.targetName,
        target_type: rating.targetType,
        overall_rating: rating.overallRating,
        punctuality_rating: rating.punctualityRating,
        communication_rating: rating.communicationRating,
        professionalism_rating: rating.professionalismRating,
        comment: rating.comment || null,
        freight_code: rating.freightCode || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('ratings')
        .insert([newRating])
        .select()
        .single();

      if (error) {
        // Tratar erros específicos relacionados a tabelas/schema do Supabase
        if (
          error.code === '42P01' || // Tabela não existe
          error.message?.includes('relation \"users\" does not exist') ||
          error.message?.includes('does not exist')
        ) {
          console.error('Detalhes do erro:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // Salvar no LocalStorage como fallback
          return this.createLocalOnly(rating);
        }
        
        throw error;
      }

      // Recalcular média de rating do target (Supabase)
      await this.updateTargetAverageRating(rating.targetId);
      
      // 🆕 Também atualizar no LocalStorage para manter sincronizado
      this.updateTargetAverageRatingLocal(rating.targetId);

      return {
        success: true,
        data: this.convertFromSupabase(data)
      };
    } catch (error: any) {
      console.error('Erro ao criar avaliação:', error);
      
      // Se a coluna não existe, retornar erro mais amigável
      if (error.code === '42703') {
        return this.createLocalOnly(rating);
      }
      
      // Erro genérico de schema/infraestrutura - salvar localmente
      if (
        error.code === '42P01' ||
        error.message?.includes('relation') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('permission denied')
      ) {
        return this.createLocalOnly(rating);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Criar avaliação apenas no LocalStorage (fallback quando Supabase falha)
   */
  private createLocalOnly(rating: Omit<Rating, 'id' | 'createdAt'>): DatabaseResponse<Rating> {
    try {
      const now = new Date().toISOString();
      const newRating: Rating = {
        id: crypto.randomUUID(),
        ...rating,
        createdAt: now,
        updatedAt: now
      };

      // Salvar no LocalStorage
      const storageKey = 'maisfrete_ratings';
      const existing = localStorage.getItem(storageKey);
      const ratings: Rating[] = existing ? JSON.parse(existing) : [];
      
      // Verificar duplicatas
      const isDuplicate = ratings.some(
        r => r.freightId === rating.freightId && 
             r.targetId === rating.targetId && 
             r.evaluatorId === rating.evaluatorId
      );
      
      if (isDuplicate) {
        return {
          success: false,
          error: 'Você já avaliou este usuário para este frete'
        };
      }
      
      ratings.push(newRating);
      localStorage.setItem(storageKey, JSON.stringify(ratings));


      // 🆕 Atualizar média de rating do target no LocalStorage
      this.updateTargetAverageRatingLocal(rating.targetId);

      return {
        success: true,
        data: newRating
      };
    } catch (error: any) {
      console.error('Erro ao salvar avaliação no LocalStorage:', error);
      return {
        success: false,
        error: 'Erro ao salvar avaliação localmente'
      };
    }
  }

  /**
   * Buscar avaliação por ID
   */
  async getById(id: string): Promise<DatabaseResponse<Rating>> {
    try {
      const supabase = this.getClient();
      if (!supabase) {
        return {
          success: false,
          error: 'Supabase não está disponível'
        };
      }

      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: this.convertFromSupabase(data)
      };
    } catch (error: any) {
      console.error('Erro ao buscar avaliação:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar todas as avaliações recebidas por um usuário
   */
  async getByTarget(targetId: string): Promise<DatabaseResponse<Rating[]>> {
    
    try {
      const supabase = this.getClient();
      
      if (!supabase) {
        // Buscar do LocalStorage
        const result = this.getByTargetLocal(targetId);
        return result;
      }

      
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('target_id', targetId)
        .order('created_at', { ascending: false });


      if (error) {
        console.error('❌ Erro no Supabase:', error);
        throw error;
      }

      const converted = data?.map(this.convertFromSupabase) || [];

      return {
        success: true,
        data: converted
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar avaliações do target:', error);
      // Fallback para LocalStorage se Supabase falhar
      const result = this.getByTargetLocal(targetId);
      return result;
    }
  }

  /**
   * Buscar avaliações do LocalStorage
   */
  private getByTargetLocal(targetId: string): DatabaseResponse<Rating[]> {
    
    try {
      const storageKey = 'maisfrete_ratings';
      const existing = localStorage.getItem(storageKey);
      
      const ratings: Rating[] = existing ? JSON.parse(existing) : [];
      
      if (ratings.length > 0) {
        // [REVISAR] console.log('📋 Todas as avaliações no LocalStorage:', ratings.map(r => ({
        // id: r.id,
        // targetId: r.targetId,
        // evaluatorName: r.evaluatorName,
        // overallRating: r.overallRating
        // })));
      }
      
      const filtered = ratings
        .filter(r => r.targetId === targetId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());


      return {
        success: true,
        data: filtered
      };
    } catch (error) {
      console.error('❌ Erro ao buscar avaliações do LocalStorage:', error);
      return {
        success: true,
        data: []
      };
    }
  }

  /**
   * Buscar todas as avaliações feitas por um usuário
   */
  async getByEvaluator(evaluatorId: string): Promise<DatabaseResponse<Rating[]>> {
    try {
      const supabase = this.getClient();
      if (!supabase) {
        // Buscar do LocalStorage
        return this.getByEvaluatorLocal(evaluatorId);
      }

      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('evaluator_id', evaluatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data?.map(this.convertFromSupabase) || []
      };
    } catch (error: any) {
      console.error('Erro ao buscar avaliações do avaliador:', error);
      
      // Fallback para LocalStorage
      return this.getByEvaluatorLocal(evaluatorId);
    }
  }

  /**
   * Buscar avaliações por avaliador do LocalStorage
   */
  private getByEvaluatorLocal(evaluatorId: string): DatabaseResponse<Rating[]> {
    try {
      const storageKey = 'maisfrete_ratings';
      const existing = localStorage.getItem(storageKey);
      const ratings: Rating[] = existing ? JSON.parse(existing) : [];
      
      const filtered = ratings
        .filter(r => r.evaluatorId === evaluatorId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        success: true,
        data: filtered
      };
    } catch (error) {
      console.error('Erro ao buscar avaliações do LocalStorage:', error);
      return {
        success: true,
        data: []
      };
    }
  }

  /**
   * Buscar todas as avaliações recebidas por um motorista (alias para getByTarget)
   */
  async getByDriver(driverId: string, options?: { limit?: number }): Promise<DatabaseResponse<Rating[]>> {
    try {
      const supabase = this.getClient();
      if (!supabase) {
        // Buscar do LocalStorage
        const result = this.getByTargetLocal(driverId);
        if (result.success && result.data && options?.limit) {
          result.data = result.data.slice(0, options.limit);
        }
        return result;
      }

      let query = supabase
        .from('ratings')
        .select('*')
        .eq('target_id', driverId)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data?.map(this.convertFromSupabase) || []
      };
    } catch (error: any) {
      console.error('Erro ao buscar avaliações do motorista:', error);
      // Fallback para LocalStorage
      const result = this.getByTargetLocal(driverId);
      if (result.success && result.data && options?.limit) {
        result.data = result.data.slice(0, options.limit);
      }
      return result;
    }
  }

  /**
   * Buscar avaliações de um frete
   */
  async getByFreight(freightId: string): Promise<DatabaseResponse<Rating[]>> {
    try {
      const supabase = this.getClient();
      if (!supabase) {
        // Buscar do LocalStorage
        return this.getByFreightLocal(freightId);
      }

      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('freight_id', freightId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data?.map(this.convertFromSupabase) || []
      };
    } catch (error: any) {
      console.error('Erro ao buscar avaliações do frete:', error);
      return this.getByFreightLocal(freightId);
    }
  }

  /**
   * Buscar avaliações por frete do LocalStorage
   */
  private getByFreightLocal(freightId: string): DatabaseResponse<Rating[]> {
    try {
      const storageKey = 'maisfrete_ratings';
      const existing = localStorage.getItem(storageKey);
      const ratings: Rating[] = existing ? JSON.parse(existing) : [];
      
      const filtered = ratings
        .filter(r => r.freightId === freightId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        success: true,
        data: filtered
      };
    } catch (error) {
      console.error('Erro ao buscar avaliações do LocalStorage:', error);
      return {
        success: true,
        data: []
      };
    }
  }

  /**
   * Buscar todas as avaliações (com limite opcional)
   */
  async getAll(options?: { limit?: number }): Promise<DatabaseResponse<Rating[]>> {
    try {
      const supabase = this.getClient();
      if (!supabase) {
        return {
          success: true,
          data: []
        };
      }

      let query = supabase
        .from('ratings')
        .select('*')
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data?.map(this.convertFromSupabase) || []
      };
    } catch (error: any) {
      console.error('Erro ao buscar todas as avaliações:', error);
      return {
        success: true,
        data: []
      };
    }
  }

  /**
   * Calcular estatísticas de avaliação de um usuário
   */
  async getRatingStats(targetId: string): Promise<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: Record<number, number>;
    averagePunctuality: number;
    averageCommunication: number;
    averageProfessionalism: number;
  }> {
    try {
      const result = await this.getByTarget(targetId);
      
      if (!result.success || !result.data || result.data.length === 0) {
        return {
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: {},
          averagePunctuality: 0,
          averageCommunication: 0,
          averageProfessionalism: 0
        };
      }

      const ratings = result.data;
      const totalRatings = ratings.length;

      // Calcular médias
      const sumOverall = ratings.reduce((sum, r) => sum + r.overallRating, 0);
      const sumPunctuality = ratings.reduce((sum, r) => sum + r.punctualityRating, 0);
      const sumCommunication = ratings.reduce((sum, r) => sum + r.communicationRating, 0);
      const sumProfessionalism = ratings.reduce((sum, r) => sum + r.professionalismRating, 0);

      // Distribuição de ratings
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach(r => {
        const rating = Math.round(r.overallRating);
        distribution[rating] = (distribution[rating] || 0) + 1;
      });

      return {
        averageRating: Number((sumOverall / totalRatings).toFixed(2)),
        totalRatings,
        ratingDistribution: distribution,
        averagePunctuality: Number((sumPunctuality / totalRatings).toFixed(2)),
        averageCommunication: Number((sumCommunication / totalRatings).toFixed(2)),
        averageProfessionalism: Number((sumProfessionalism / totalRatings).toFixed(2))
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: {},
        averagePunctuality: 0,
        averageCommunication: 0,
        averageProfessionalism: 0
      };
    }
  }

  /**
   * Atualizar média de rating do usuário no perfil
   */
  private async updateTargetAverageRating(targetId: string): Promise<void> {
    try {
      const supabase = this.getClient();
      if (!supabase) return;

      const stats = await this.getRatingStats(targetId);
      
      // Atualizar na tabela profiles
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            rating: stats.averageRating,
            total_ratings: stats.totalRatings
          })
          .eq('id', targetId);

        if (error) {
          // Se a tabela não existe (42P01), erro de RLS/trigger referenciando 'users' incorretamente,
          // ou qualquer outro erro relacionado a schema/permissões
          if (
            error.code === '42P01' || 
            error.code === '42703' ||
            error.message?.includes('relation "users" does not exist') ||
            error.message?.includes('does not exist') ||
            error.message?.includes('permission denied')
          ) {
            // [REVISAR] console.log(`📊 Rating calculado (LocalStorage): ${stats.averageRating} (${stats.totalRatings} avaliações)`);
            return; // Continuar normalmente, apenas não atualiza no Supabase
          }
          throw error; // Re-lançar outros erros inesperados
        }

      } catch (updateError: any) {
        // Fallback adicional: se algo der errado, apenas logar e continuar
        // [REVISAR] console.warn('⚠️ Erro ao atualizar rating no Supabase (continuando normalmente):', updateError.message || updateError);
        // [REVISAR] console.log(`📊 Rating calculado (LocalStorage): ${stats.averageRating} (${stats.totalRatings} avaliações)`);
        return;
      }
    } catch (error: any) {
      // Erro ao calcular estatísticas - não falhar a operação principal
      console.error('Erro ao calcular/atualizar rating médio:', error);
    }
  }

  /**
   * Atualizar média de rating do target no LocalStorage
   */
  private updateTargetAverageRatingLocal(targetId: string): void {
    try {
      const storageKey = 'maisfrete_ratings';
      const existing = localStorage.getItem(storageKey);
      const ratings: Rating[] = existing ? JSON.parse(existing) : [];
      
      const targetRatings = ratings.filter(r => r.targetId === targetId);
      const totalRatings = targetRatings.length;

      if (totalRatings === 0) {
        return; // Sem avaliações para calcular
      }

      const sumOverall = targetRatings.reduce((sum, r) => sum + r.overallRating, 0);
      const averageRating = Number((sumOverall / totalRatings).toFixed(2));

      // Atualizar no LocalStorage
      const usersStorageKey = 'maisfrete_users';
      const usersData = localStorage.getItem(usersStorageKey);
      if (usersData) {
        const users = JSON.parse(usersData);
        const userIndex = users.findIndex((u: any) => u.id === targetId);
        
        if (userIndex !== -1) {
          users[userIndex].rating = averageRating;
          users[userIndex].profile = users[userIndex].profile || {};
          users[userIndex].profile.rating = averageRating;
          users[userIndex].profile.totalRatings = totalRatings;
          localStorage.setItem(usersStorageKey, JSON.stringify(users));
        }
      }

    } catch (error: any) {
      console.error('Erro ao atualizar rating médio no LocalStorage:', error);
    }
  }

  /**
   * Obter rating médio do LocalStorage (público para uso em componentes)
   */
  async getAverageRatingLocal(targetId: string): Promise<{ averageRating: number; totalRatings: number }> {
    try {
      const stats = await this.getRatingStats(targetId);
      return {
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings
      };
    } catch (error) {
      return { averageRating: 0, totalRatings: 0 };
    }
  }

  /**
   * Verificar se um usuário já avaliou outro em um frete específico
   */
  async hasEvaluated(freightId: string, evaluatorId: string, targetId: string): Promise<boolean> {
    try {
      const supabase = this.getClient();
      if (!supabase) {
        // Verificar no LocalStorage se Supabase não está disponível
        return this.hasEvaluatedLocal(freightId, evaluatorId, targetId);
      }

      const { data, error } = await supabase
        .from('ratings')
        .select('id')
        .eq('freight_id', freightId)
        .eq('evaluator_id', evaluatorId)
        .eq('target_id', targetId)
        .maybeSingle();

      if (error) {
        // Se a coluna não existe, verificar no LocalStorage
        if (error.code === '42703') {
          return this.hasEvaluatedLocal(freightId, evaluatorId, targetId);
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Erro ao verificar avaliação:', error);
      // Fallback para LocalStorage em caso de erro
      return this.hasEvaluatedLocal(freightId, evaluatorId, targetId);
    }
  }

  /**
   * Verificar se um usuário já avaliou outro no LocalStorage
   */
  private hasEvaluatedLocal(freightId: string, evaluatorId: string, targetId: string): boolean {
    try {
      const storageKey = 'maisfrete_ratings';
      const existing = localStorage.getItem(storageKey);
      const ratings: Rating[] = existing ? JSON.parse(existing) : [];
      
      return ratings.some(
        r => r.freightId === freightId && 
             r.evaluatorId === evaluatorId && 
             r.targetId === targetId
      );
    } catch (error) {
      console.error('Erro ao verificar avaliação no LocalStorage:', error);
      return false;
    }
  }

  /**
   * Converter dados do Supabase para o formato da aplicação
   */
  private convertFromSupabase(data: any): Rating {
    return {
      id: data.id,
      freightId: data.freight_id,
      freightCode: data.freight_code || null, // ✅ Retorna null se vazio
      targetId: data.target_id,
      targetName: data.target_name || '',
      targetType: data.target_type || 'caminhoneiro',
      evaluatorId: data.evaluator_id,
      evaluatorName: data.evaluator_name || '',
      evaluatorType: data.evaluator_type || 'transportadora',
      overallRating: data.overall_rating,
      punctualityRating: data.punctuality_rating || 0,
      communicationRating: data.communication_rating || 0,
      professionalismRating: data.professionalism_rating || 0,
      comment: data.comment,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const ratingRepository = new RatingRepository();