/**
 * Activity Logger
 * Helpers para registrar atividades dos usuários
 */

import { activityLogRepository } from './database/repositories/activity-log-repository';
import type { ActivityLogCreate } from './database/repositories/activity-log-repository';

/**
 * Log de atividades de colaboradores
 */
export const logCollaboratorActivity = {
  async created(userId: string, userName: string, companyId: string, collaboratorName: string, collaboratorEmail: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'collaborator_created',
      category: 'collaborators',
      description: `Criou o colaborador ${collaboratorName} (${collaboratorEmail})`,
      metadata: {
        collaboratorName,
        collaboratorEmail
      }
    });
  },

  async invited(userId: string, userName: string, companyId: string, email: string, roleName: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'collaborator_invited',
      category: 'collaborators',
      description: `Convidou ${email} como ${roleName}`,
      metadata: {
        email,
        roleName
      }
    });
  },

  async activated(userId: string, userName: string, companyId: string, collaboratorName: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'collaborator_activated',
      category: 'collaborators',
      description: `Ativou o colaborador ${collaboratorName}`,
      metadata: {
        collaboratorName
      }
    });
  },

  async deactivated(userId: string, userName: string, companyId: string, collaboratorName: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'collaborator_deactivated',
      category: 'collaborators',
      description: `Desativou o colaborador ${collaboratorName}`,
      metadata: {
        collaboratorName
      }
    });
  },

  async roleChanged(userId: string, userName: string, companyId: string, collaboratorName: string, oldRole: string, newRole: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'role_changed',
      category: 'collaborators',
      description: `Alterou o cargo de ${collaboratorName} de ${oldRole} para ${newRole}`,
      metadata: {
        collaboratorName,
        oldRole,
        newRole
      }
    });
  }
};

/**
 * Log de atividades de fretes
 */
export const logFreightActivity = {
  async created(userId: string, userName: string, companyId: string, freightTitle: string, freightId: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'freight_created',
      category: 'freights',
      description: `Criou o frete "${freightTitle}"`,
      targetType: 'freight',
      targetId: freightId,
      metadata: {
        freightTitle
      }
    });
  },

  async updated(userId: string, userName: string, companyId: string, freightTitle: string, freightId: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'freight_updated',
      category: 'freights',
      description: `Atualizou o frete "${freightTitle}"`,
      targetType: 'freight',
      targetId: freightId,
      metadata: {
        freightTitle
      }
    });
  },

  async deleted(userId: string, userName: string, companyId: string, freightTitle: string, freightId: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'freight_deleted',
      category: 'freights',
      description: `Excluiu o frete "${freightTitle}"`,
      targetType: 'freight',
      targetId: freightId,
      metadata: {
        freightTitle
      }
    });
  }
};

/**
 * Log de atividades de cotações
 */
export const logQuoteActivity = {
  async created(userId: string, userName: string, companyId: string, freightTitle: string, value: number) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'quote_created',
      category: 'quotes',
      description: `Criou uma cotação de R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para "${freightTitle}"`,
      metadata: {
        freightTitle,
        value
      }
    });
  },

  async accepted(userId: string, userName: string, companyId: string, bidderName: string, value: number) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'quote_accepted',
      category: 'quotes',
      description: `Aceitou a cotação de ${bidderName} no valor de R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      metadata: {
        bidderName,
        value
      }
    });
  },

  async rejected(userId: string, userName: string, companyId: string, bidderName: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'quote_rejected',
      category: 'quotes',
      description: `Rejeitou a cotação de ${bidderName}`,
      metadata: {
        bidderName
      }
    });
  }
};

/**
 * Log de atividades financeiras
 */
export const logFinancialActivity = {
  async paymentProcessed(userId: string, userName: string, companyId: string, amount: number, description: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'payment_processed',
      category: 'financials',
      description: `Processou pagamento de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${description}`,
      metadata: {
        amount,
        description
      }
    });
  }
};

/**
 * Log de atividades de configurações
 */
export const logSettingsActivity = {
  async changed(userId: string, userName: string, companyId: string, setting: string, oldValue: any, newValue: any) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'settings_changed',
      category: 'settings',
      description: `Alterou configuração: ${setting}`,
      metadata: {
        setting,
        oldValue,
        newValue
      }
    });
  },

  async customRoleCreated(userId: string, userName: string, companyId: string, roleName: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'custom_role_created',
      category: 'settings',
      description: `Criou o cargo personalizado "${roleName}"`,
      metadata: {
        roleName
      }
    });
  }
};

/**
 * Log de atividades de autenticação
 */
export const logAuthActivity = {
  async login(userId: string, userName: string, companyId: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'login',
      category: 'auth',
      description: `Fez login no sistema`,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  },

  async logout(userId: string, userName: string, companyId: string) {
    return await activityLogRepository.create({
      userId,
      userName,
      companyId,
      actionType: 'logout',
      category: 'auth',
      description: `Saiu do sistema`,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Helper genérico para criar log
 */
export async function logActivity(data: ActivityLogCreate) {
  return await activityLogRepository.create(data);
}
