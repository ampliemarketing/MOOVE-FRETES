import { supabase } from '../../supabase/client';
import { DBResponse } from '../db-client';

export interface ProfileView {
  id: string;
  viewerId: string;
  targetId: string;
  createdAt: string;
}

export class ProfileViewRepository {
  /**
   * Registra uma nova visualização de perfil
   */
  async recordView(viewerId: string, targetId: string): Promise<DBResponse<ProfileView>> {
    try {
      const { data, error } = await supabase
        .from('profile_views')
        .insert({
          viewer_id: viewerId,
          target_id: targetId,
        })
        .select()
        .single();

      if (error) throw error;
      return { 
        success: true, 
        data: {
          id: data.id,
          viewerId: data.viewer_id,
          targetId: data.target_id,
          createdAt: data.created_at
        } 
      };
    } catch (error: any) {
      console.error('❌ [ProfileViewRepository] Erro ao registrar visualização:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém o total de visualizações de um perfil
   */
  async getViewCount(targetId: string): Promise<DBResponse<number>> {
    try {
      const { count, error } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('target_id', targetId);

      if (error) throw error;
      return { success: true, data: count || 0 };
    } catch (error: any) {
      console.error('❌ [ProfileViewRepository] Erro ao obter contagem de visualizações:', error);
      return { success: false, error: error.message };
    }
  }
}

export const profileViewRepository = new ProfileViewRepository();
