/**
 * User Repository
 * CRUD operations for User entities
 * COM SINCRONIZAÇÃO SUPABASE
 */

import { db, DBResponse } from '../db-client';
import { User, KeyPatterns } from '../schema';
import { getSupabaseClient } from '../../supabase/client';

export class UserRepository {
  /**
   * Create a new user
   * ⚠️ IMPORTANTE: ID deve ser fornecido (UUID do Supabase Auth)
   */
  async create(user: Omit<User, 'createdAt' | 'updatedAt'> & { id?: string }): Promise<DBResponse<User>> {
    try {
      // ✅ O ID DEVE vir do Supabase Auth - não gerar ID customizado
      if (!user.id) {
        return {
          success: false,
          error: 'User ID is required (must come from Supabase Auth)',
        };
      }
      
      const id = user.id;
      const now = new Date().toISOString();
      
      const newUser: User = {
        ...user,
        id,
        createdAt: now,
        updatedAt: now,
      };

      // Save user (apenas cache - usuário real já está no Supabase Auth)
      await db.set(KeyPatterns.user(id), newUser);
      
      // Index by email
      await db.set(KeyPatterns.userByEmail(user.email), id);
      
      // Add to users list
      const listResponse = await db.get<string[]>(KeyPatterns.usersList());
      const usersList = listResponse.data || [];
      usersList.push(id);
      await db.set(KeyPatterns.usersList(), usersList);

      return {
        success: true,
        data: newUser,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      };
    }
  }

  /**
   * Get user by ID
   * BUSCA DO SUPABASE (profiles) se não encontrar no cache
   */
  async getById(id: string): Promise<DBResponse<User>> {
    // 1. Tentar cache primeiro
    const cacheResponse = await db.get<User>(KeyPatterns.user(id));
    if (cacheResponse.success && cacheResponse.data) {
      return cacheResponse;
    }
    
    // 2. Buscar do Supabase (profiles)
    try {
      const supabase = getSupabaseClient();
      
      // Buscar de PROFILES e USERS em paralelo
      const [profileResult, userResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('profiles')  // ✅ Alterado de 'users' para 'profiles' (tabela users não existe mais)
          .select('*')
          .eq('id', id)
          .single()
      ]);
      
      // Prioridade: usar dados de profiles, mas avatar de users se disponível
      const profileData = profileResult.data;
      const userData = userResult.data;
      
      if (!profileData && !userData) {
        return {
          success: false,
          error: 'User not found',
        };
      }
      
      // Usar dados de profiles como base, mas avatar de users se disponível
      const finalData = profileData || userData;
      const avatarUrl = userData?.avatar_url || profileData?.avatar_url || '';
      
      // Transformar para formato local
      const user: User = {
        id: finalData.id,
        name: finalData.name,
        email: finalData.email || '',
        userType: finalData.user_type,
        phone: finalData.phone || '',
        createdAt: finalData.created_at,
        updatedAt: finalData.updated_at || finalData.created_at,
        profile: {
          avatar: avatarUrl, // ✅ USAR AVATAR DE USERS
          rating: finalData.rating || 0,
          totalFreights: 0,
          completedFreights: 0,
          verificationStatus: finalData.email_verified ? 'verified' : 'pending',
        },
      };
      
      // Cachear para próximas consultas
      await db.set(KeyPatterns.user(id), user);
      
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
      };
    }
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string): Promise<DBResponse<User>> {
    try {
      const idResponse = await db.get<string>(KeyPatterns.userByEmail(email));
      if (!idResponse.success || !idResponse.data) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return await this.getById(idResponse.data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
      };
    }
  }

  /**
   * Update user
   */
  async update(id: string, updates: Partial<User>): Promise<DBResponse<User>> {
    try {
      const userResponse = await this.getById(id);
      if (!userResponse.success || !userResponse.data) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const updatedUser: User = {
        ...userResponse.data,
        ...updates,
        id, // Preserve ID
        updatedAt: new Date().toISOString(),
      };

      await db.set(KeyPatterns.user(id), updatedUser);

      return {
        success: true,
        data: updatedUser,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      };
    }
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<DBResponse<void>> {
    try {
      const userResponse = await this.getById(id);
      if (!userResponse.success || !userResponse.data) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Remove from email index
      await db.delete(KeyPatterns.userByEmail(userResponse.data.email));
      
      // Remove from users list
      const listResponse = await db.get<string[]>(KeyPatterns.usersList());
      if (listResponse.success && listResponse.data) {
        const updatedList = listResponse.data.filter(userId => userId !== id);
        await db.set(KeyPatterns.usersList(), updatedList);
      }
      
      // Delete user
      await db.delete(KeyPatterns.user(id));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      };
    }
  }

  /**
   * Get all users
   */
  async getAll(): Promise<DBResponse<User[]>> {
    try {
      const listResponse = await db.get<string[]>(KeyPatterns.usersList());
      if (!listResponse.success || !listResponse.data) {
        return {
          success: true,
          data: [],
        };
      }

      const usersResponse = await db.mget<User>(
        listResponse.data.map(id => KeyPatterns.user(id))
      );

      return {
        success: true,
        data: usersResponse.data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get users',
      };
    }
  }

  /**
   * Search users
   */
  async search(query: {
    userType?: User['userType'];
    name?: string;
    verified?: boolean;
  }): Promise<DBResponse<User[]>> {
    try {
      const allUsersResponse = await this.getAll();
      if (!allUsersResponse.success || !allUsersResponse.data) {
        return {
          success: true,
          data: [],
        };
      }

      let users = allUsersResponse.data;

      // Filter by user type
      if (query.userType) {
        users = users.filter(u => u.userType === query.userType);
      }

      // Filter by name
      if (query.name) {
        const searchTerm = query.name.toLowerCase();
        users = users.filter(u => 
          u.name.toLowerCase().includes(searchTerm)
        );
      }

      // Filter by verification status
      if (query.verified !== undefined) {
        const targetStatus = query.verified ? 'verified' : 'pending';
        users = users.filter(u => 
          u.profile?.verificationStatus === targetStatus
        );
      }

      return {
        success: true,
        data: users,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search users',
      };
    }
  }

  /**
   * Update user gamification
   */
  async addXP(id: string, xp: number): Promise<DBResponse<User>> {
    try {
      const userResponse = await this.getById(id);
      if (!userResponse.success || !userResponse.data) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const user = userResponse.data;
      const currentXP = user.gamification.xp;
      const newXP = currentXP + xp;
      
      // Calculate level (simple: 1000 XP per level)
      const newLevel = Math.floor(newXP / 1000) + 1;

      return await this.update(id, {
        gamification: {
          ...user.gamification,
          xp: newXP,
          level: newLevel,
        },
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add XP',
      };
    }
  }

  /**
   * Add badge to user
   */
  async addBadge(id: string, badge: string): Promise<DBResponse<User>> {
    try {
      const userResponse = await this.getById(id);
      if (!userResponse.success || !userResponse.data) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const user = userResponse.data;
      const badges = [...user.gamification.badges];
      
      if (!badges.includes(badge)) {
        badges.push(badge);
      }

      return await this.update(id, {
        gamification: {
          ...user.gamification,
          badges,
        },
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add badge',
      };
    }
  }
}

export const userRepository = new UserRepository();