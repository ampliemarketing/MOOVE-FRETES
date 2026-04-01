import { db } from './db-client';
import type { Collaborator, DatabaseResponse } from './schema';
import { logger } from '../logger';
import type { CollaboratorRole, CollaboratorInvite } from '../collaborator-types';
import { getRoleById } from '../collaborator-types';

const COLLABORATORS_KEY = 'collaborators:list';
const COLLABORATOR_PREFIX = 'collaborator:';
const COMPANY_COLLABORATORS_PREFIX = 'company_collaborators:';
const CUSTOM_ROLES_PREFIX = 'custom_roles:';
const INVITES_PREFIX = 'collaborator_invites:';

// ============================================
// COLLABORATOR OPERATIONS
// ============================================

export const collaborators = {
  // Create a new collaborator
  async create(data: {
    companyId: string;
    userId: string;
    name: string;
    email: string;
    phone?: string;
    roleId: string;
    isSuperAdmin: boolean;
    createdBy: string;
  }): Promise<DatabaseResponse<Collaborator>> {
    try {
      const id = `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get custom roles for this company
      const customRoles = await this.getCustomRoles(data.companyId);
      const role = getRoleById(data.roleId, customRoles.data || []);
      
      if (!role) {
        return { success: false, error: 'Cargo não encontrado' };
      }

      const collaborator: Collaborator = {
        id,
        companyId: data.companyId,
        userId: data.userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        roleId: data.roleId,
        role,
        isSuperAdmin: data.isSuperAdmin,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: data.createdBy,
      };

      // Store collaborator
      localStorage.setItem(`${COLLABORATOR_PREFIX}${id}`, JSON.stringify(collaborator));
      
      // Add to global list
      const allCollaborators = JSON.parse(localStorage.getItem(COLLABORATORS_KEY) || '[]');
      allCollaborators.push(id);
      localStorage.setItem(COLLABORATORS_KEY, JSON.stringify(allCollaborators));
      
      // Add to company's collaborator list
      const companyKey = `${COMPANY_COLLABORATORS_PREFIX}${data.companyId}`;
      const companyCollaborators = JSON.parse(localStorage.getItem(companyKey) || '[]');
      companyCollaborators.push(id);
      localStorage.setItem(companyKey, JSON.stringify(companyCollaborators));

      return { success: true, data: collaborator };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao criar colaborador' };
    }
  },

  // Get collaborator by ID
  async getById(id: string): Promise<DatabaseResponse<Collaborator>> {
    try {
      const data = localStorage.getItem(`${COLLABORATOR_PREFIX}${id}`);
      if (!data) {
        return { success: false, error: 'Colaborador não encontrado' };
      }
      return { success: true, data: JSON.parse(data) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar colaborador' };
    }
  },

  // Get collaborator by user ID
  async getByUserId(userId: string): Promise<DatabaseResponse<Collaborator>> {
    try {
      logger.debug('collaborators.getByUserId', 'Buscando colaborador para userId:', userId);
      
      const allIds = JSON.parse(localStorage.getItem(COLLABORATORS_KEY) || '[]');
      logger.debug('collaborators.getByUserId', `IDs de colaboradores encontrados: ${allIds.length}`);
      
      for (const id of allIds) {
        const data = localStorage.getItem(`${COLLABORATOR_PREFIX}${id}`);
        if (data) {
          const collaborator = JSON.parse(data);
          logger.debug('collaborators.getByUserId', `Verificando colaborador ${id}:`, {
            userId: collaborator.userId,
            match: collaborator.userId === userId
          });
          
          if (collaborator.userId === userId) {
            logger.success('collaborators.getByUserId', 'Colaborador encontrado!', {
              id: collaborator.id,
              name: collaborator.name,
              email: collaborator.email
            });
            return {
              success: true,
              data: collaborator
            };
          }
        }
      }
      
      // Não logar como warning - é normal que usuários não sejam colaboradores
      return { success: false, error: 'Colaborador não encontrado' };
    } catch (error) {
      logger.error('collaborators.getByUserId', 'Erro:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar colaborador' };
    }
  },

  // Get all collaborators for a company
  async getByCompany(companyId: string): Promise<DatabaseResponse<Collaborator[]>> {
    try {
      const companyKey = `${COMPANY_COLLABORATORS_PREFIX}${companyId}`;
      const collaboratorIds = JSON.parse(localStorage.getItem(companyKey) || '[]');
      
      const collaborators: Collaborator[] = [];
      const customRoles = await this.getCustomRoles(companyId);
      
      for (const id of collaboratorIds) {
        const data = localStorage.getItem(`${COLLABORATOR_PREFIX}${id}`);
        if (data) {
          const collaborator = JSON.parse(data);
          // Update role reference with latest data
          const role = getRoleById(collaborator.roleId, customRoles.data || []);
          if (role) {
            collaborator.role = role;
          }
          collaborators.push(collaborator);
        }
      }
      
      return { success: true, data: collaborators };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar colaboradores' };
    }
  },

  // Get all collaborators (global list)
  async list(): Promise<DatabaseResponse<Collaborator[]>> {
    try {
      const allIds = JSON.parse(localStorage.getItem(COLLABORATORS_KEY) || '[]');
      const collaborators: Collaborator[] = [];
      
      for (const id of allIds) {
        const data = localStorage.getItem(`${COLLABORATOR_PREFIX}${id}`);
        if (data) {
          const collaborator = JSON.parse(data);
          collaborators.push(collaborator);
        }
      }
      
      return { success: true, data: collaborators };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao listar colaboradores' };
    }
  },

  // Update collaborator
  async update(id: string, updates: Partial<Collaborator>): Promise<DatabaseResponse<Collaborator>> {
    try {
      const existing = await this.getById(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Colaborador não encontrado' };
      }

      const updated = { ...existing.data, ...updates };
      
      // If role changed, update role reference
      if (updates.roleId && updates.roleId !== existing.data.roleId) {
        const customRoles = await this.getCustomRoles(existing.data.companyId);
        const role = getRoleById(updates.roleId, customRoles.data || []);
        if (role) {
          updated.role = role;
        }
      }

      localStorage.setItem(`${COLLABORATOR_PREFIX}${id}`, JSON.stringify(updated));
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao atualizar colaborador' };
    }
  },

  // Deactivate collaborator (soft delete)
  async deactivate(id: string): Promise<DatabaseResponse<void>> {
    try {
      const result = await this.update(id, { isActive: false });
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao desativar colaborador' };
    }
  },

  // Reactivate collaborator
  async reactivate(id: string): Promise<DatabaseResponse<void>> {
    try {
      const result = await this.update(id, { isActive: true });
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao reativar colaborador' };
    }
  },

  // Update last access
  async updateLastAccess(id: string): Promise<DatabaseResponse<void>> {
    try {
      await this.update(id, { lastAccess: new Date().toISOString() });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao atualizar acesso' };
    }
  },

  // ============================================
  // CUSTOM ROLES OPERATIONS
  // ============================================

  // Get custom roles for a company
  async getCustomRoles(companyId: string): Promise<DatabaseResponse<CollaboratorRole[]>> {
    try {
      const key = `${CUSTOM_ROLES_PREFIX}${companyId}`;
      const data = localStorage.getItem(key);
      return { success: true, data: data ? JSON.parse(data) : [] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar cargos personalizados' };
    }
  },

  // Create custom role
  async createCustomRole(companyId: string, role: Omit<CollaboratorRole, 'id' | 'isCustom'>): Promise<DatabaseResponse<CollaboratorRole>> {
    try {
      const id = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newRole: CollaboratorRole = {
        ...role,
        id,
        isCustom: true
      };

      const key = `${CUSTOM_ROLES_PREFIX}${companyId}`;
      const existing = await this.getCustomRoles(companyId);
      const roles = existing.data || [];
      roles.push(newRole);
      
      localStorage.setItem(key, JSON.stringify(roles));
      return { success: true, data: newRole };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao criar cargo' };
    }
  },

  // Update custom role
  async updateCustomRole(companyId: string, roleId: string, updates: Partial<CollaboratorRole>): Promise<DatabaseResponse<CollaboratorRole>> {
    try {
      const key = `${CUSTOM_ROLES_PREFIX}${companyId}`;
      const existing = await this.getCustomRoles(companyId);
      const roles = existing.data || [];
      
      const index = roles.findIndex(r => r.id === roleId);
      if (index === -1) {
        return { success: false, error: 'Cargo não encontrado' };
      }

      roles[index] = { ...roles[index], ...updates };
      localStorage.setItem(key, JSON.stringify(roles));
      
      return { success: true, data: roles[index] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao atualizar cargo' };
    }
  },

  // Delete custom role
  async deleteCustomRole(companyId: string, roleId: string): Promise<DatabaseResponse<void>> {
    try {
      // Check if any collaborator uses this role
      const collaboratorsResult = await this.getByCompany(companyId);
      if (collaboratorsResult.success && collaboratorsResult.data) {
        const hasUsers = collaboratorsResult.data.some(c => c.roleId === roleId);
        if (hasUsers) {
          return { success: false, error: 'Não é possível excluir um cargo em uso' };
        }
      }

      const key = `${CUSTOM_ROLES_PREFIX}${companyId}`;
      const existing = await this.getCustomRoles(companyId);
      const roles = (existing.data || []).filter(r => r.id !== roleId);
      
      localStorage.setItem(key, JSON.stringify(roles));
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao excluir cargo' };
    }
  },

  // ============================================
  // INVITE OPERATIONS
  // ============================================

  // Create invite
  async createInvite(data: {
    companyId: string;
    email: string;
    roleId: string;
    invitedBy: string;
    invitedByName: string;
  }): Promise<DatabaseResponse<CollaboratorInvite>> {
    try {
      const id = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const invite: CollaboratorInvite = {
        id,
        companyId: data.companyId,
        email: data.email,
        roleId: data.roleId,
        invitedBy: data.invitedBy,
        invitedByName: data.invitedByName,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      const key = `${INVITES_PREFIX}${data.companyId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(invite);
      localStorage.setItem(key, JSON.stringify(existing));

      return { success: true, data: invite };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao criar convite' };
    }
  },

  // Get invites for a company
  async getInvitesByCompany(companyId: string): Promise<DatabaseResponse<CollaboratorInvite[]>> {
    try {
      const key = `${INVITES_PREFIX}${companyId}`;
      const data = localStorage.getItem(key);
      return { success: true, data: data ? JSON.parse(data) : [] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar convites' };
    }
  },

  // Update invite status
  async updateInviteStatus(companyId: string, inviteId: string, status: CollaboratorInvite['status']): Promise<DatabaseResponse<void>> {
    try {
      const key = `${INVITES_PREFIX}${companyId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      
      const index = existing.findIndex((i: CollaboratorInvite) => i.id === inviteId);
      if (index === -1) {
        return { success: false, error: 'Convite não encontrado' };
      }

      existing[index].status = status;
      localStorage.setItem(key, JSON.stringify(existing));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao atualizar convite' };
    }
  }
};