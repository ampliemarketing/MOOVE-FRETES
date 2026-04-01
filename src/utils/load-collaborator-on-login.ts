/**
 * Load Collaborator Data on Login
 * Carrega dados de colaborador quando um usuário faz login
 * 
 * Fluxo:
 * 1. Se user_type === 'collaborator' → busca na tabela collaborators do Supabase
 * 2. Encontra o company_id (= owner's user_id) 
 * 3. Busca dados da empresa na tabela companies
 * 4. Anexa ao objeto user para o dashboard usar como contexto da empresa
 */

import { supabase } from './supabase/client';
import { collaboratorRepository } from './database/repositories/collaborator-repository';
import { logger } from './logger';
import type { User } from '../components/contexts/AppContext';

/**
 * Carrega dados de colaborador para o usuário logado
 * Funciona para DOIS cenários:
 * 
 * A) user_type = 'collaborator' → É um colaborador, busca qual empresa ele pertence
 * B) user_type = 'transportadora'/'agenciador' → É dono, verifica se tem registro como super_admin
 */
export async function loadCollaboratorData(user: User): Promise<User> {
  try {
    const userType = user.userType;
    
    // ──────────────────────────────────────────────────────
    // CENÁRIO A: Usuário É um colaborador
    // ──────────────────────────────────────────────────────
    if (userType === 'collaborator') {
      logger.info('loadCollaboratorData', `Usuário ${user.id} é COLABORADOR - buscando empresa vinculada...`);
      
      // 1. Buscar registro de colaborador no Supabase
      const collaborator = await collaboratorRepository.getByUserId(user.id);
      
      if (!collaborator) {
        logger.warn('loadCollaboratorData', 'Colaborador não encontrado na tabela collaborators');
        return user;
      }
      
      if (!collaborator.isActive) {
        logger.warn('loadCollaboratorData', 'Colaborador está INATIVO');
        return {
          ...user,
          collaborator: {
            id: collaborator.id,
            companyId: collaborator.companyId,
            companyName: '',
            role: collaborator.roleId,
            isActive: false,
            isSuperAdmin: false,
          }
        };
      }
      
      logger.info('loadCollaboratorData', `Colaborador encontrado: ${collaborator.name}, empresa: ${collaborator.companyId}`);
      
      // 2. Buscar dados da empresa
      // company_id no nosso sistema = owner's user_id (auth.uid do dono)
      let companyName = 'Empresa';
      let companyData: any = null;
      
      try {
        // Primeiro tentar buscar pela tabela companies usando user_id = company_id
        const { data: company } = await supabase
          .from('companies')
          .select('id, company_name, trading_name, company_type, user_id')
          .eq('user_id', collaborator.companyId)
          .single();
        
        if (company) {
          companyName = company.trading_name || company.company_name;
          companyData = company;
          logger.info('loadCollaboratorData', `Empresa encontrada: ${companyName}`);
        } else {
          // Fallback: buscar nome do dono na tabela profiles
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', collaborator.companyId)
            .single();
          
          if (ownerProfile) {
            companyName = ownerProfile.name || ownerProfile.email || 'Empresa';
          }
        }
      } catch (err) {
        logger.warn('loadCollaboratorData', 'Erro ao buscar dados da empresa:', err);
      }
      
      // 3. Atualizar last_access do colaborador
      try {
        await supabase
          .from('collaborators')
          .update({ last_access: new Date().toISOString() })
          .eq('id', collaborator.id);
      } catch {
        // Não fatal
      }
      
      // 4. Retornar user com dados do colaborador
      return {
        ...user,
        // O colaborador "assume" o contexto da empresa
        company: companyName,
        collaborator: {
          id: collaborator.id,
          companyId: collaborator.companyId,
          companyName,
          role: collaborator.roleId,
          isActive: collaborator.isActive,
          isSuperAdmin: collaborator.isSuperAdmin,
        }
      };
    }
    
    // ──────────────────────────────────────────────────────
    // CENÁRIO B: Dono de empresa (transportadora/agenciador/embarcador)
    // Não precisa de dados de colaborador — ele É o admin
    // ──────────────────────────────────────────────────────
    if (userType === 'transportadora' || userType === 'agenciador' || userType === 'embarcador') {
      logger.debug('loadCollaboratorData', `Usuário ${userType} é dono da empresa, não precisa de dados de colaborador`);
      return user;
    }
    
    // CENÁRIO C: Caminhoneiro ou outro tipo — não tem colaboradores
    return user;
    
  } catch (error) {
    logger.error('loadCollaboratorData', 'Erro ao carregar dados de colaborador:', error);
    return user;
  }
}
