import { getSupabaseClient } from '../../supabase/client';

export interface Favorite {
  id: string;
  userId: string;
  driverId: string;
  createdAt: string;
}

interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class FavoriteRepository {
  private getClient() {
    return getSupabaseClient();
  }

  /**
   * Adicionar motorista aos favoritos
   */
  async addFavorite(userId: string, driverId: string): Promise<DatabaseResponse<Favorite>> {
    try {
      const supabase = this.getClient();
      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not available'
        };
      }

      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          driver_id: driverId
        })
        .select()
        .single();

      if (error) {
        // Se já existe, retornar sucesso mesmo assim
        if (error.code === '23505') {
          return {
            success: true,
            data: {
              id: '',
              userId,
              driverId,
              createdAt: new Date().toISOString()
            }
          };
        }
        throw error;
      }

      return {
        success: true,
        data: {
          id: data.id,
          userId: data.user_id,
          driverId: data.driver_id,
          createdAt: data.created_at
        }
      };
    } catch (error: any) {
      console.error('Erro ao adicionar favorito:', error);
      return {
        success: false,
        error: error.message || 'Failed to add favorite'
      };
    }
  }

  /**
   * Remover motorista dos favoritos
   */
  async removeFavorite(userId: string, driverId: string): Promise<DatabaseResponse<void>> {
    try {
      const supabase = this.getClient();
      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not available'
        };
      }

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('driver_id', driverId);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Erro ao remover favorito:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove favorite'
      };
    }
  }

  /**
   * Verificar se um motorista está nos favoritos
   */
  async isFavorite(userId: string, driverId: string): Promise<DatabaseResponse<boolean>> {
    try {
      const supabase = this.getClient();
      if (!supabase) {
        return {
          success: true,
          data: false
        };
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('driver_id', driverId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      return {
        success: true,
        data: !!data
      };
    } catch (error: any) {
      console.error('Erro ao verificar favorito:', error);
      return {
        success: true,
        data: false
      };
    }
  }

  /**
   * Buscar todos os favoritos de um usuário
   */
  async getUserFavorites(userId: string): Promise<DatabaseResponse<string[]>> {
    try {
      
      const supabase = this.getClient();
      if (!supabase) {
        return {
          success: true,
          data: []
        };
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('driver_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [FavoriteRepository] Erro na query:', error);
        throw error;
      }

      // [REVISAR] console.log('📊 [FavoriteRepository] Favoritos encontrados:', {
      // count: data?.length || 0,
      // driverIds: data?.map(f => f.driver_id)
      // });

      return {
        success: true,
        data: data?.map(f => f.driver_id) || []
      };
    } catch (error: any) {
      console.error('❌ [FavoriteRepository] Erro ao buscar favoritos:', error);
      return {
        success: true,
        data: []
      };
    }
  }

  /**
   * Contar quantos motoristas estão nos favoritos
   */
  async countFavorites(userId: string): Promise<DatabaseResponse<number>> {
    try {
      const supabase = this.getClient();
      if (!supabase) {
        return {
          success: true,
          data: 0
        };
      }

      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;

      return {
        success: true,
        data: count || 0
      };
    } catch (error: any) {
      console.error('Erro ao contar favoritos:', error);
      return {
        success: true,
        data: 0
      };
    }
  }
}

export const favoriteRepository = new FavoriteRepository();