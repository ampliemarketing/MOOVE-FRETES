/**
 * Collaborator Repository v2
 * Gerenciamento de colaboradores com Supabase
 */

import { supabase } from '../../supabase/client';
import { logger } from '../../logger';
import type { CollaboratorRole } from '../../collaborator-types';
import { getRoleById } from '../../collaborator-types';

export interface Collaborator {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  role?: CollaboratorRole;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomRole {
  id: string;
  companyId: string;
  roleId: string;
  name: string;
  description?: string;
  permissions: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCollaboratorData {
  companyId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  isSuperAdmin: boolean;
  createdBy: string;
}

export interface UpdateCollaboratorData {
  name?: string;
  email?: string;
  phone?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface CreateCustomRoleData {
  companyId: string;
  roleId: string;
  name: string;
  description?: string;
  permissions: string[];
  createdBy: string;
}

export class CollaboratorRepository {
  /**
   * Criar novo colaborador
   */
  async create(data: CreateCollaboratorData): Promise<Collaborator | null> {
    try {
      logger.info('[CollaboratorRepository] Creating collaborator', { 
        email: data.email,
        companyId: data.companyId,
        roleId: data.roleId
      });

      const { data: result, error } = await supabase
        .from('collaborators')
        .insert({
          company_id: data.companyId,
          user_id: data.userId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role_id: data.roleId,
          is_super_admin: data.isSuperAdmin,
          is_active: true,
          created_by: data.createdBy
        })
        .select()
        .single();

      if (error) {
        logger.error('[CollaboratorRepository] Error creating collaborator', { error });
        return null;
      }

      logger.success('[CollaboratorRepository] Collaborator created', { id: result.id });
      return this.mapToCollaborator(result);
    } catch (error) {
      logger.error('[CollaboratorRepository] Exception creating collaborator', { error });
      return null;
    }
  }

  /**
   * Buscar colaborador por ID
   */
  async getById(id: string): Promise<Collaborator | null> {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToCollaborator(data);
    } catch (error) {
      logger.error('[CollaboratorRepository] Error getting collaborator by ID', { error, id });
      return null;
    }
  }

  /**
   * Buscar colaborador por user ID
   */
  async getByUserId(userId: string): Promise<Collaborator | null> {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToCollaborator(data);
    } catch (error) {
      logger.error('[CollaboratorRepository] Error getting collaborator by user ID', { error, userId });
      return null;
    }
  }

  /**
   * Buscar colaborador por email
   */
  async getByEmail(email: string, companyId: string): Promise<Collaborator | null> {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('email', email)
        .eq('company_id', companyId)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToCollaborator(data);
    } catch (error) {
      logger.error('[CollaboratorRepository] Error getting collaborator by email', { error, email });
      return null;
    }
  }

  /**
   * Listar colaboradores de uma empresa
   */
  async getByCompany(companyId: string): Promise<Collaborator[]> {
    try {
      logger.info('[CollaboratorRepository] Getting company collaborators', { companyId });

      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[CollaboratorRepository] Error getting company collaborators', { error });
        return [];
      }

      // Buscar custom roles da empresa
      const customRolesData = await this.getCustomRolesByCompany(companyId);
      
      // Mapear e preencher role objects
      return (data || []).map(item => {
        const collaborator = this.mapToCollaborator(item);
        const customRole = customRolesData.find(r => r.roleId === collaborator.roleId);
        
        if (customRole) {
          collaborator.role = {
            id: customRole.roleId,
            name: customRole.name,
            description: customRole.description,
            permissions: customRole.permissions as any,
            isCustom: true
          };
        } else {
          // Usar role padrão
          collaborator.role = getRoleById(collaborator.roleId, []);
        }
        
        return collaborator;
      });
    } catch (error) {
      logger.error('[CollaboratorRepository] Exception getting company collaborators', { error });
      return [];
    }
  }

  /**
   * Listar todos os colaboradores
   */
  async list(): Promise<Collaborator[]> {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[CollaboratorRepository] Error listing collaborators', { error });
        return [];
      }

      return (data || []).map(item => this.mapToCollaborator(item));
    } catch (error) {
      logger.error('[CollaboratorRepository] Exception listing collaborators', { error });
      return [];
    }
  }

  /**
   * Atualizar colaborador
   */
  async update(id: string, updates: UpdateCollaboratorData): Promise<Collaborator | null> {
    try {
      logger.info('[CollaboratorRepository] Updating collaborator', { id, updates });

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.roleId !== undefined) updateData.role_id = updates.roleId;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { data, error } = await supabase
        .from('collaborators')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('[CollaboratorRepository] Error updating collaborator', { error });
        return null;
      }

      logger.success('[CollaboratorRepository] Collaborator updated', { id });
      return this.mapToCollaborator(data);
    } catch (error) {
      logger.error('[CollaboratorRepository] Exception updating collaborator', { error });
      return null;
    }
  }

  /**
   * Desativar colaborador
   */
  async deactivate(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        logger.error('[CollaboratorRepository] Error deactivating collaborator', { error });
        return false;
      }

      logger.success('[CollaboratorRepository] Collaborator deactivated', { id });
      return true;
    } catch (error) {
      logger.error('[CollaboratorRepository] Exception deactivating collaborator', { error });
      return false;
    }
  }

  /**
   * Reativar colaborador
   */
  async reactivate(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ is_active: true })
        .eq('id', id);

      if (error) {
        logger.error('[CollaboratorRepository] Error reactivating collaborator', { error });
        return false;
      }

      logger.success('[CollaboratorRepository] Collaborator reactivated', { id });
      return true;
    } catch (error) {
      logger.error('[CollaboratorRepository] Exception reactivating collaborator', { error });
      return false;
    }
  }

  /**
   * Deletar colaborador
   */
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('[CollaboratorRepository] Error deleting collaborator', { error });
        return false;
      }

      logger.success('[CollaboratorRepository] Collaborator deleted', { id });
      return true;
    } catch (error) {
      logger.error('[CollaboratorRepository] Exception deleting collaborator', { error });
      return false;
    }
  }

  // ============================================
  // CUSTOM ROLES
  // ============================================

  /**
   * Criar cargo personalizado
   */
  async createCustomRole(data: CreateCustomRoleData): Promise<CustomRole | null> {
    try {
      logger.info('[CollaboratorRepository] Creating custom role', { 
        roleId: data.roleId,
        companyId: data.companyId
      });

      const { data: result, error } = await supabase
        .from('custom_roles')
        .insert({
          company_id: data.companyId,
          role_id: data.roleId,
          name: data.name,
          description: data.description,
          permissions: data.permissions,
          created_by: data.createdBy
        })
        .select()
        .single();

      if (error) {
        logger.error('[CollaboratorRepository] Error creating custom role', { error });
        return null;
      }

      logger.success('[CollaboratorRepository] Custom role created', { id: result.id });
      return this.mapToCustomRole(result);
    } catch (error) {
      logger.error('[CollaboratorRepository] Exception creating custom role', { error });
      return null;
    }
  }

  /**
   * Buscar cargos personalizados de uma empresa
   */
  async getCustomRolesByCompany(companyId: string): Promise<CustomRole[]> {
    try {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[CollaboratorRepository] Error getting custom roles', { error });
        return [];
      }

      return (data || []).map(item => this.mapToCustomRole(item));
    } catch (error) {
      logger.error('[CollaboratorRepository] Exception getting custom roles', { error });
      return [];
    }
  }

  /**
   * Atualizar cargo personalizado
   */
  async updateCustomRole(
    id: string, 
    updates: { name?: string; description?: string; permissions?: string[] }
  ): Promise<CustomRole | null> {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.permissions !== undefined) updateData.permissions = updates.permissions;

      const { data, error } = await supabase
        .from('custom_roles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('[CollaboratorRepository] Error updating custom role', { error });
        return null;
      }

      return this.mapToCustomRole(data);
    } catch (error) {
      logger.error('[CollaboratorRepository] Exception updating custom role', { error });
      return null;
    }
  }

  /**
   * Deletar cargo personalizado
   */
  async deleteCustomRole(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('[CollaboratorRepository] Error deleting custom role', { error });
        return false;
      }

      logger.success('[CollaboratorRepository] Custom role deleted', { id });
      return true;
    } catch (error) {
      logger.error('[CollaboratorRepository] Exception deleting custom role', { error });
      return false;
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private mapToCollaborator(data: any): Collaborator {
    return {
      id: data.id,
      companyId: data.company_id,
      userId: data.user_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      roleId: data.role_id,
      isSuperAdmin: data.is_super_admin,
      isActive: data.is_active,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapToCustomRole(data: any): CustomRole {
    return {
      id: data.id,
      companyId: data.company_id,
      roleId: data.role_id,
      name: data.name,
      description: data.description,
      permissions: data.permissions || [],
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const collaboratorRepository = new CollaboratorRepository();