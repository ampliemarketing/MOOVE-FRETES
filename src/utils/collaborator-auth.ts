/**
 * Collaborator Authentication System
 * Cria contas Supabase Auth para colaboradores
 * 
 * ⚠️ IMPORTANTE: Usa signUp do client, mas preserva a sessão do admin
 * salvando e restaurando a sessão antes/depois da criação.
 */

import { supabase } from './supabase/client';
import { database } from './database';
import { collaboratorRepository } from './database/repositories/collaborator-repository';

export interface CreateCollaboratorAuthParams {
  email: string;
  password: string;
  name: string;
  phone: string;
  companyId: string;
  roleId: string;
  createdBy: string;
}

export interface CreateCollaboratorAuthResult {
  success: boolean;
  data?: {
    userId: string;
    collaboratorId: string;
  };
  error?: string;
}

/**
 * Cria um colaborador com conta Supabase Auth
 * 
 * Flow:
 * 1. Salva sessão do admin atual
 * 2. Cria usuário no Supabase Auth (email + senha)
 * 3. Restaura sessão do admin
 * 4. Cria perfil na tabela profiles
 * 5. Cria registro de colaborador na tabela collaborators
 */
export async function createCollaboratorWithAuth(
  params: CreateCollaboratorAuthParams
): Promise<CreateCollaboratorAuthResult> {
  const { email, password, name, phone, companyId, roleId, createdBy } = params;
  
  // 🔒 Salvar sessão do admin ANTES de tudo
  const { data: sessionData } = await supabase.auth.getSession();
  const adminSession = sessionData?.session;
  
  if (!adminSession) {
    return {
      success: false,
      error: 'Você precisa estar logado para criar colaboradores'
    };
  }
  
  try {
    
    // 1. Verificar se email já é colaborador NESTA empresa
    const existingCollaborator = await collaboratorRepository.getByEmail(email, companyId);
    if (existingCollaborator) {
      return {
        success: false,
        error: 'Este email já está cadastrado como colaborador nesta empresa'
      };
    }
    
    // 2. Tentar criar conta no Supabase Auth
    let newUserId: string | null = null;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
          user_type: 'collaborator',
          company_id: companyId,
        },
        emailRedirectTo: window.location.origin
      }
    });
    
    if (authError) {
      // ✅ Tratar "User already registered" - o usuário já existe no Auth
      if (authError.message?.includes('already registered') || 
          authError.message?.includes('already been registered') ||
          authError.status === 422) {
        
        // Buscar o user_id do usuário existente pela tabela profiles
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();
        
        if (profileError || !existingProfile) {
          // 🔄 Restaurar sessão do admin antes de retornar erro
          await restoreAdminSession(adminSession);
          return {
            success: false,
            error: 'Este email já está registrado no sistema. O usuário precisa ser adicionado como colaborador manualmente, ou use outro email.'
          };
        }
        
        newUserId = existingProfile.id;
      } else {
        // Outro erro qualquer
        await restoreAdminSession(adminSession);
        return {
          success: false,
          error: `Erro ao criar conta: ${authError.message}`
        };
      }
    } else if (authData?.user) {
      newUserId = authData.user.id;
    } else {
      await restoreAdminSession(adminSession);
      return {
        success: false,
        error: 'Usuário não foi criado (resposta vazia do Supabase)'
      };
    }
    
    // 3. 🔒 RESTAURAR SESSÃO DO ADMIN IMEDIATAMENTE
    // O signUp pode ter trocado a sessão ativa
    await restoreAdminSession(adminSession);
    
    // 4. Criar/atualizar perfil na tabela profiles (se não existir)
    if (newUserId) {
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', newUserId)
          .single();
        
        if (!existingProfile) {
          // Criar perfil novo
          const { error: profileInsertError } = await supabase
            .from('profiles')
            .insert({
              id: newUserId,
              email,
              name,
              phone,
              user_type: 'collaborator',
              verification_status: 'verified',
              is_active: true,
            });
          
          if (profileInsertError) {
            console.error('❌ Erro ao criar profile:', profileInsertError);
            // Não é fatal - o profile pode ser criado no próximo login
          } else {
          }
        } else {
        }
      } catch (profileErr) {
        // [REVISAR] console.warn('⚠️ Erro ao verificar/criar profile (não fatal):', profileErr);
      }
    }
    
    // 5. Criar registro de colaborador na tabela collaborators
    const collaboratorResult = await collaboratorRepository.create({
      userId: newUserId!,
      companyId,
      name,
      email,
      phone,
      roleId,
      createdBy,
      isSuperAdmin: false
    });
    
    if (!collaboratorResult) {
      console.error('❌ Erro ao criar colaborador no Supabase');
      return {
        success: false,
        error: 'Erro ao criar registro de colaborador. Verifique as permissões (RLS) da tabela collaborators.'
      };
    }
    
    
    // 6. FALLBACK: Também salvar no LocalStorage para compatibilidade
    try {
      await database.collaborators.create({
        userId: newUserId!,
        companyId,
        name,
        email,
        phone,
        roleId,
        createdBy,
        isSuperAdmin: false,
        isActive: true
      });
      // [REVISAR] console.log('✅ Colaborador salvo no LocalStorage (backup)');
    } catch (localError) {
      // [REVISAR] console.warn('⚠️ Não foi possível salvar no LocalStorage (não crítico)');
    }
    
    
    return {
      success: true,
      data: {
        userId: newUserId!,
        collaboratorId: collaboratorResult.id
      }
    };
    
  } catch (error) {
    // 🔒 Garantir que a sessão do admin seja restaurada mesmo em caso de exceção
    try {
      await restoreAdminSession(adminSession);
    } catch {
      console.error('❌ CRÍTICO: Não foi possível restaurar sessão do admin!');
    }
    
    console.error('');
    console.error('━'.repeat(80));
    console.error('❌ ERRO AO CRIAR COLABORADOR');
    console.error('━'.repeat(80));
    console.error('📝 Erro:', error);
    console.error('━'.repeat(80));
    console.error('');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Restaura a sessão do admin após operações que podem trocar o usuário ativo
 */
async function restoreAdminSession(adminSession: {
  access_token: string;
  refresh_token: string;
}) {
  try {
    const { error } = await supabase.auth.setSession({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token,
    });
    
    if (error) {
      console.error('❌ Erro ao restaurar sessão do admin:', error);
      throw error;
    }
  } catch (err) {
    console.error('❌ Falha ao restaurar sessão:', err);
    throw err;
  }
}

/**
 * Verifica se um email já está em uso
 */
export async function checkEmailAvailable(email: string): Promise<boolean> {
  try {
    // Verificar na tabela profiles do Supabase
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      if (data) {
        return false;
      }
    } catch {
      // Sem resultado = email disponível
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    return true; // Em caso de erro, permite continuar
  }
}

/**
 * Gera senha temporária segura
 */
export function generateTemporaryPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  let password = '';
  
  // Garantir pelo menos 1 de cada tipo
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%&*'[Math.floor(Math.random() * 7)];
  
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
