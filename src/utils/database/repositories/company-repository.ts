/**
 * Company Repository
 * CRUD operations for Company entities
 * COM SINCRONIZAÇÃO SUPABASE
 */

import { db, DBResponse } from '../db-client';
import { Company, KeyPatterns, PaginationParams } from '../schema';
import { getSupabaseClient } from '../../supabase/client';

export class CompanyRepository {
  /**
   * Create a new company
   */
  async create(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<DBResponse<Company>> {
    try {
      const now = new Date().toISOString();
      let createdId: string;
      
      // 🔥 1. SALVAR NO SUPABASE PRIMEIRO - deixar Supabase gerar UUID
      try {
        const supabase = getSupabaseClient();
        
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('companies')
          .insert({
            // ❌ NÃO passar ID - deixar Supabase gerar UUID automaticamente
            user_id: company.userId,
            company_name: company.name, // ✅ CORRIGIDO: coluna é company_name, não name
            cnpj: company.cnpj || null,
            phone: company.phone || null,
            corporate_email: company.email || null, // ✅ CORRIGIDO: coluna é corporate_email, não email
            company_type: (company as any).companyType || 'transportadora', // ✅ NOT NULL - precisa de valor
            address: company.address ? (typeof company.address === 'string' ? {
              city: company.city || '',
              state: company.state || '',
              cep: company.cep || '',
            } : company.address) : {
              city: company.city || '',
              state: company.state || '',
              cep: company.cep || '',
            }, // ✅ CORRIGIDO: city/state/cep são parte do JSONB address
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        
        if (supabaseError) {
          console.error('❌ Erro ao salvar empresa no Supabase:', supabaseError);
          throw supabaseError;
        }
        
        // ✅ Pegar o ID gerado pelo Supabase
        createdId = supabaseData.id;
        console.log('✅ Empresa salva no Supabase:', createdId);
        
      } catch (supabaseError) {
        console.error('❌ ERRO CRÍTICO ao salvar empresa:', supabaseError);
        throw new Error('Erro ao salvar empresa: ' + (supabaseError instanceof Error ? supabaseError.message : 'Unknown'));
      }

      // 2. CACHEAR NO LOCALSTORAGE
      const newCompany: Company = {
        ...company,
        id: createdId,
        createdAt: now,
        updatedAt: now,
      };

      try {
        // Save company
        await db.set(KeyPatterns.company(createdId), newCompany);
        
        // Index by user ID
        await db.set(KeyPatterns.companyByUserId(company.userId), createdId);
        
        // Add to companies list
        const listResponse = await db.get<string[]>(KeyPatterns.companiesList());
        const companiesList = listResponse.data || [];
        companiesList.push(createdId);
        await db.set(KeyPatterns.companiesList(), companiesList);
      } catch (cacheError) {
        console.warn('⚠️ Erro ao cachear empresa:', cacheError);
      }

      return {
        success: true,
        data: newCompany,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create company',
      };
    }
  }

  /**
   * Get company by ID
   * BUSCA DO SUPABASE se não encontrar no cache
   */
  async getById(id: string): Promise<DBResponse<Company>> {
    // 1. Tentar cache primeiro
    const cacheResponse = await db.get<Company>(KeyPatterns.company(id));
    if (cacheResponse.success && cacheResponse.data) {
      return cacheResponse;
    }
    
    // 2. Buscar do Supabase
    try {
      const supabase = getSupabaseClient();
      const { data: companyData, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !companyData) {
        return {
          success: false,
          error: 'Company not found',
        };
      }
      
      const { count: totalFreights } = await supabase
        .from('freights')
        .select('*', { count: 'exact', head: true })
        .in('publisher_id', [id, companyData.user_id]);

      // Transformar para formato local
      const company: Company = {
        id: companyData.id,
        userId: companyData.user_id,
        name: companyData.company_name,
        tradingName: companyData.trading_name,
        cnpj: companyData.cnpj,
        type: companyData.company_type,
        stateRegistration: companyData.state_registration,
        municipalRegistration: companyData.municipal_registration,
        phone: companyData.phone,
        website: companyData.website,
        description: companyData.description,
        address: companyData.address,
        certifications: companyData.certifications || [],
        fleetSize: companyData.fleet_size || 0,
        operatingStates: companyData.operating_states || [],
        rating: 5.0, 
        totalFreights: totalFreights || 0,
        status: 'active',
        createdAt: companyData.created_at,
        updatedAt: companyData.updated_at,
      };
      
      // Cachear para próximas consultas
      await db.set(KeyPatterns.company(id), company);
      
      return {
        success: true,
        data: company,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get company',
      };
    }
  }

  /**
   * Get company by user ID
   * BUSCA DO SUPABASE PRIMEIRO
   */
  async getByUserId(userId: string): Promise<DBResponse<Company>> {
    try {
      // 1. Tentar buscar do Supabase primeiro
      const supabase = getSupabaseClient();
      const { data: companyData, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .single() as { data: any; error: any };

      if (!error && companyData) {
        const { count: totalFreights } = await supabase
          .from('freights')
          .select('*', { count: 'exact', head: true })
          .in('publisher_id', [companyData.id, companyData.user_id]);

        // Transformar para formato local
        const company: Company = {
          id: companyData.id,
          userId: companyData.user_id,
          name: companyData.company_name,
          tradingName: companyData.trading_name,
          cnpj: companyData.cnpj,
          type: companyData.company_type,
          stateRegistration: companyData.state_registration,
          municipalRegistration: companyData.municipal_registration,
          phone: companyData.phone,
          website: companyData.website,
          description: companyData.description,
          address: companyData.address,
          certifications: companyData.certifications || [],
          fleetSize: companyData.fleet_size || 0,
          operatingStates: companyData.operating_states || [],
          rating: 5.0,
          totalFreights: totalFreights || 0,
          status: 'active',
          createdAt: companyData.created_at,
          updatedAt: companyData.updated_at,
        };
        
        // Cachear
        await db.set(KeyPatterns.company(company.id), company);
        await db.set(KeyPatterns.companyByUserId(userId), company.id);
        
        return {
          success: true,
          data: company,
        };
      }
      
      // 2. FALLBACK: Buscar do LocalStorage
      const idResponse = await db.get<string>(KeyPatterns.companyByUserId(userId));
      if (!idResponse.success || !idResponse.data) {
        return {
          success: false,
          error: 'Company not found',
        };
      }

      return await this.getById(idResponse.data);
    } catch (error) {
      console.error('❌ [company-repository] Erro ao buscar empresa:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get company',
      };
    }
  }

  /**
   * Update company
   */
  async update(id: string, updates: Partial<Company>): Promise<DBResponse<Company>> {
    try {
      const companyResponse = await this.getById(id);
      if (!companyResponse.success || !companyResponse.data) {
        return {
          success: false,
          error: 'Company not found',
        };
      }

      const updatedCompany: Company = {
        ...companyResponse.data,
        ...updates,
        id, // Preserve ID
        updatedAt: new Date().toISOString(),
      };

      await db.set(KeyPatterns.company(id), updatedCompany);

      return {
        success: true,
        data: updatedCompany,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update company',
      };
    }
  }

  /**
   * Delete company
   */
  async delete(id: string): Promise<DBResponse<void>> {
    try {
      const companyResponse = await this.getById(id);
      if (!companyResponse.success || !companyResponse.data) {
        return {
          success: false,
          error: 'Company not found',
        };
      }

      const company = companyResponse.data;

      // Remove from user index
      await db.delete(KeyPatterns.companyByUserId(company.userId));
      
      // Remove from companies list
      const listResponse = await db.get<string[]>(KeyPatterns.companiesList());
      if (listResponse.success && listResponse.data) {
        const updatedList = listResponse.data.filter(cId => cId !== id);
        await db.set(KeyPatterns.companiesList(), updatedList);
      }
      
      // Delete company
      await db.delete(KeyPatterns.company(id));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete company',
      };
    }
  }

  /**
   * Get all companies
   * BUSCA DO SUPABASE (fonte primária) e popula LocalStorage (cache)
   */
  async getAll(pagination?: PaginationParams): Promise<DBResponse<Company[]>> {
    try {
      // 1. BUSCAR DO SUPABASE PRIMEIRO (fonte primária)
      let companies: Company[] = [];
      
      try {
        const supabase = getSupabaseClient();
        
        const { data: supabaseCompanies, error } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ Erro ao buscar do Supabase:', error);
        } else if (supabaseCompanies && supabaseCompanies.length > 0) {
          
          // Buscar todos os contadores de frete em massa (ou definir valores mockados e resolver um a um de forma async)
          // Transformar dados do Supabase para formato local
          companies = await Promise.all(supabaseCompanies.map(async sc => {
            const { count: totalFreights } = await supabase
              .from('freights')
              .select('*', { count: 'exact', head: true })
              .in('publisher_id', [sc.id, sc.user_id]);
              
            return {
              id: sc.id,
              userId: sc.user_id,
              name: sc.company_name,
              tradingName: sc.trading_name,
              cnpj: sc.cnpj,
              type: sc.company_type,
              stateRegistration: sc.state_registration,
              municipalRegistration: sc.municipal_registration,
              phone: sc.phone,
              website: sc.website,
              description: sc.description,
              address: sc.address,
              certifications: sc.certifications || [],
              fleetSize: sc.fleet_size || 0,
              operatingStates: sc.operating_states || [],
              rating: 5.0,
              totalFreights: totalFreights || 0,
              status: 'active',
              createdAt: sc.created_at,
              updatedAt: sc.updated_at || sc.created_at,
            };
          }));
        }
      } catch (supabaseError) {
        console.error('❌ Erro ao buscar do Supabase:', supabaseError);
      }
      
      // 2. FALLBACK: Se Supabase falhar, buscar do LocalStorage
      if (companies.length === 0) {
        const listResponse = await db.get<string[]>(KeyPatterns.companiesList());
        
        if (!listResponse.success || !listResponse.data || listResponse.data.length === 0) {
          return {
            success: true,
            data: [],
          };
        }

        let companyIds = listResponse.data;

        // Apply pagination to IDs
        if (pagination) {
          const { page = 1, limit = 20 } = pagination;
          const start = (page - 1) * limit;
          const end = start + limit;
          companyIds = companyIds.slice(start, end);
        }

        const companiesResponse = await db.mget<Company>(
          companyIds.map(id => KeyPatterns.company(id))
        );

        companies = companiesResponse.data || [];
      }

      // Apply pagination to final results
      if (pagination && companies.length > 0) {
        const { page = 1, limit = 20 } = pagination;
        const start = (page - 1) * limit;
        const end = start + limit;
        companies = companies.slice(start, end);
      }

      return {
        success: true,
        data: companies,
      };
    } catch (error) {
      console.error('❌ Erro ao buscar empresas:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get companies',
      };
    }
  }

  /**
   * Get companies by business type
   */
  async getByBusinessType(businessType: Company['businessType'], pagination?: PaginationParams): Promise<DBResponse<Company[]>> {
    try {
      const allCompaniesResponse = await this.getAll();
      if (!allCompaniesResponse.success || !allCompaniesResponse.data) {
        return {
          success: true,
          data: [],
        };
      }

      let companies = allCompaniesResponse.data.filter(c => c.businessType === businessType);

      // Apply pagination
      if (pagination) {
        const { page = 1, limit = 20 } = pagination;
        const start = (page - 1) * limit;
        const end = start + limit;
        companies = companies.slice(start, end);
      }

      return {
        success: true,
        data: companies,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get companies by type',
      };
    }
  }

  /**
   * Get verified companies
   */
  async getVerified(pagination?: PaginationParams): Promise<DBResponse<Company[]>> {
    try {
      const allCompaniesResponse = await this.getAll();
      if (!allCompaniesResponse.success || !allCompaniesResponse.data) {
        return {
          success: true,
          data: [],
        };
      }

      let companies = allCompaniesResponse.data.filter(c => c.verificationStatus === 'verified');

      // Apply pagination
      if (pagination) {
        const { page = 1, limit = 20 } = pagination;
        const start = (page - 1) * limit;
        const end = start + limit;
        companies = companies.slice(start, end);
      }

      return {
        success: true,
        data: companies,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get verified companies',
      };
    }
  }

  /**
   * Update verification status
   */
  async updateVerificationStatus(id: string, status: Company['verificationStatus']): Promise<DBResponse<Company>> {
    return await this.update(id, {
      verificationStatus: status,
    });
  }

  // ❌ REMOVIDO: Método generateId() não é mais necessário
  // O Supabase gera UUIDs automaticamente
}

export const companyRepository = new CompanyRepository();