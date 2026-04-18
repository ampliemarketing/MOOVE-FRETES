/**
 * Helper functions for collaborator management
 * 
 * NOTE: Edge Functions are DISABLED in this application.
 * Server sync functionality is kept for backward compatibility.
 */

import { database } from './database';
import { projectId, publicAnonKey } from './supabase/info';
import { DEFAULT_ROLES } from './collaborator-types';
import type { User } from '../components/contexts/AppContext';

// ⚠️ DEPRECATED: Edge Functions are disabled
// This URL is kept for reference only - sync operations are disabled
const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-24200374`; // DISABLED - DO NOT USE

/**
 * Auto-create Super Admin collaborator when company registers
 */
export async function createSuperAdmin(user: User): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar se já existe um Super Admin para esta empresa
    const existingCollaborators = await database.collaborators.list();
    
    if (existingCollaborators.success && existingCollaborators.data) {
      const companyCollaborators = existingCollaborators.data.filter(c => 
        c.userId === user.id && c.isSuperAdmin
      );
      
      if (companyCollaborators.length > 0) {
        return { success: true };
      }
    }

    // Criar Super Admin automaticamente
    const collaboratorResult = await database.collaborators.create({
      userId: user.id,
      companyId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      roleId: 'super_admin', // ✅ Corrigido: usar underscore, não hífen
      createdBy: user.id,
      isSuperAdmin: true,
      isActive: true
    });

    if (!collaboratorResult.success) {
      console.error('❌ Erro ao criar Super Admin:', collaboratorResult.error);
      return {
        success: false,
        error: 'Erro ao criar perfil de administrador'
      };
    }

    // Sincronizar com Supabase Database (opcional)
    try {
      const SERVER_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
      
      if (!SERVER_URL || SERVER_URL === 'http://localhost:54321/functions/v1') {
        return { success: true };
      }

      const response = await fetch(`${SERVER_URL}/create-collaborator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          companyId: user.id,
          roleId: 'super_admin', // ✅ Corrigido: usar underscore, não hífen
          isSuperAdmin: true
        })
      });

      if (!response.ok) {
        // Silenciar erro - sistema funciona sem sincronização
      }
    } catch (syncError) {
      // Silenciar erro - sistema funciona localmente
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao criar Super Admin:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Auto-create Super Admin collaborator when company registers
 * Alias for createSuperAdmin with different signature for registration flow
 */
export async function createSuperAdminOnRegistration(
  userData: any,
  userId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    
    // Criar Super Admin automaticamente
    const collaboratorResult = await database.collaborators.create({
      userId: userId,
      companyId: companyId,
      name: userData.name || userData.email.split('@')[0],
      email: userData.email,
      phone: userData.phone || '',
      roleId: 'super_admin', // ✅ Corrigido: usar underscore, não hífen
      createdBy: userId,
      isSuperAdmin: true,
      isActive: true
    });

    if (!collaboratorResult.success) {
      console.error('❌ Erro ao criar Super Admin no registro:', collaboratorResult.error);
      return {
        success: false,
        error: 'Erro ao criar perfil de administrador'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao criar Super Admin no registro:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Check for pending invite by email
 */
export async function checkPendingInvite(email: string): Promise<{
  hasPendingInvite: boolean;
  invite?: any;
  error?: string;
}> {
  try {
    // Check LocalStorage first
    const localInvite = localStorage.getItem(`invite_by_email:${email}`);
    if (localInvite) {
      const invite = JSON.parse(localInvite);
      if (invite.status === 'pending') {
        const expiresAt = new Date(invite.expiresAt);
        if (expiresAt > new Date()) {
          return { hasPendingInvite: true, invite };
        }
      }
    }

    // Check Supabase (silently fail if not available)
    try {
      // Verificar se as variáveis de ambiente estão configuradas
      if (!SERVER_URL || SERVER_URL === 'http://localhost:54321/functions/v1') {
        return { hasPendingInvite: false };
      }

      const response = await fetch(`${SERVER_URL}/collaborators/invites/email/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Store in LocalStorage for offline access
          localStorage.setItem(`invite_by_email:${email}`, JSON.stringify(data.data));
          return { hasPendingInvite: true, invite: data.data };
        }
      }
    } catch (error) {
      // Silenciar erro de fetch - não é crítico
      // [REVISAR] console.log('ℹ️ Não foi possível verificar convites no Supabase (continuando normalmente)');
    }

    return { hasPendingInvite: false };
  } catch (error) {
    console.error('Erro ao verificar convite pendente:', error);
    return {
      hasPendingInvite: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Accept invite after user registration
 */
export async function acceptInviteAfterRegistration(
  invite: any,
  userId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {

    // Accept via Supabase
    const response = await fetch(`${SERVER_URL}/collaborators/invites/${invite.id}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao aceitar convite:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    
    if (data.success) {
      
      // Update local storage
      invite.status = 'accepted';
      localStorage.setItem(`invite_by_email:${invite.email}`, JSON.stringify(invite));
      
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Erro ao aceitar convite' };
    }
  } catch (error) {
    console.error('Erro ao aceitar convite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Send notification when collaborator is invited
 */
export async function notifyCollaboratorInvited(
  inviterName: string,
  invitedEmail: string,
  companyName: string,
  ownerId?: string
): Promise<void> {
  try {
    if (!ownerId) {
      return;
    }
    // Create notification for company owner
    await database.notifications.create({
      userId: ownerId, // ✅ UUID real do dono da empresa
      title: 'Novo Colaborador Convidado',
      message: `${inviterName} convidou ${invitedEmail} para se juntar à equipe`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
      metadata: {
        type: 'collaborator_invited',
        email: invitedEmail,
        inviterName
      }
    });
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
  }
}

/**
 * Send notification when collaborator is removed
 */
export async function notifyCollaboratorRemoved(
  removerName: string,
  removedName: string,
  removedEmail: string,
  ownerId?: string
): Promise<void> {
  try {
    if (!ownerId) {
      return;
    }
    await database.notifications.create({
      userId: ownerId, // ✅ UUID real do dono da empresa
      title: 'Colaborador Removido',
      message: `${removerName} removeu ${removedName} (${removedEmail}) da equipe`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
      metadata: {
        type: 'collaborator_removed',
        removedName,
        removedEmail,
        removerName
      }
    });
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
  }
}

/**
 * Send notification when collaborator role is changed
 */
export async function notifyRoleChanged(
  changerName: string,
  collaboratorName: string,
  oldRole: string,
  newRole: string,
  ownerId?: string
): Promise<void> {
  try {
    if (!ownerId) {
      return;
    }
    await database.notifications.create({
      userId: ownerId, // ✅ UUID real do dono da empresa
      title: 'Cargo Alterado',
      message: `${changerName} alterou o cargo de ${collaboratorName} de ${oldRole} para ${newRole}`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
      metadata: {
        type: 'role_changed',
        collaboratorName,
        oldRole,
        newRole,
        changerName
      }
    });
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
  }
}