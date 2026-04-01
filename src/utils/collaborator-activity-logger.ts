/**
 * Collaborator Activity Logger
 * 
 * Helper para registrar ações de colaboradores nos activity_logs.
 * Quando um colaborador executa uma ação, registra:
 * - user_id = ID do colaborador (quem fez)
 * - company_id = ID da empresa (em nome de quem)
 * - metadata.collaborator_id = ID do registro na tabela collaborators
 * - metadata.collaborator_name = Nome do colaborador
 * - metadata.is_collaborator_action = true
 */

import { supabase } from './supabase/client';
import type { User } from '../components/contexts/AppContext';

export interface CollaboratorAction {
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  category?: string;
  targetType?: string;
  targetId?: string;
  extraMetadata?: Record<string, any>;
}

/**
 * Registra uma ação no activity_logs com contexto de colaborador
 * Funciona para AMBOS: dono da empresa e colaborador
 */
export async function logUserAction(user: User, action: CollaboratorAction): Promise<void> {
  try {
    const isCollaborator = !!user.collaborator;
    
    const metadata: Record<string, any> = {
      ...action.extraMetadata,
      is_collaborator_action: isCollaborator,
    };
    
    if (isCollaborator && user.collaborator) {
      metadata.collaborator_id = user.collaborator.id;
      metadata.collaborator_name = user.name;
      metadata.collaborator_role = user.collaborator.role;
      metadata.acting_as_company = user.collaborator.companyName;
    }
    
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        company_id: isCollaborator ? user.collaborator!.companyId : null,
        action: action.action,
        entity_type: action.entityType,
        entity_id: action.entityId || null,
        description: action.description,
        category: action.category || 'system',
        target_type: action.targetType || null,
        target_id: action.targetId || null,
        metadata,
        ip_address: null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 200) : null,
      });
    
    if (error) {
      console.error('❌ [ActivityLogger] Erro ao registrar ação:', error);
    }
  } catch (err) {
    // Logging nunca deve quebrar o fluxo principal
    console.error('❌ [ActivityLogger] Exceção ao registrar ação:', err);
  }
}

/**
 * Resolve o companyId correto baseado no usuário
 * - Se for colaborador: retorna o companyId da empresa vinculada
 * - Se for dono: retorna o próprio user.id (usado como company reference)
 */
export function resolveCompanyId(user: User): string {
  return user.collaborator?.companyId || user.id;
}

/**
 * Verifica se o usuário é um colaborador ativo
 */
export function isActiveCollaborator(user: User): boolean {
  return !!user.collaborator?.isActive;
}

/**
 * Retorna um label descritivo de quem está agindo
 * Ex: "João Silva (Colaborador da TransLog)" ou "Maria Santos"
 */
export function getActorLabel(user: User): string {
  if (user.collaborator) {
    return `${user.name} (Colaborador - ${user.collaborator.companyName})`;
  }
  return user.name;
}
