/**
 * Saved Contact Repository
 * CRUD para contatos salvos pela empresa (reutilizáveis como responsáveis de fretes)
 * Sincronização direta com Supabase
 */

import { getSupabaseClient } from '../../supabase/client';
import type { DBResponse } from '../db-client';

export interface SavedContact {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface FreightResponsibleContact {
  id: string;
  freight_id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string;
  is_main_contact: boolean;
  source: 'collaborator' | 'manual' | 'saved_contact';
  source_id: string | null;
  created_at: string;
}

export class SavedContactRepository {
  /**
   * Buscar contatos salvos da empresa
   */
  async getByCompany(companyId: string): Promise<DBResponse<SavedContact[]>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('company_saved_contacts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar contatos salvos:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Erro ao buscar contatos salvos:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get saved contacts',
      };
    }
  }

  /**
   * Criar um novo contato salvo
   */
  async create(contact: {
    company_id: string;
    name: string;
    email?: string | null;
    phone: string;
    notes?: string | null;
    created_by?: string | null;
  }): Promise<DBResponse<SavedContact>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('company_saved_contacts')
        .insert({
          company_id: contact.company_id,
          name: contact.name.trim(),
          email: contact.email?.trim() || null,
          phone: contact.phone.trim(),
          notes: contact.notes?.trim() || null,
          created_by: contact.created_by || null,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar contato salvo:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Contato salvo criado:', data.id);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Erro ao criar contato salvo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create saved contact',
      };
    }
  }

  /**
   * Atualizar um contato salvo
   */
  async update(id: string, updates: {
    name?: string;
    email?: string | null;
    phone?: string;
    notes?: string | null;
  }): Promise<DBResponse<SavedContact>> {
    try {
      const supabase = getSupabaseClient();
      const payload: any = { updated_at: new Date().toISOString() };
      
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.email !== undefined) payload.email = updates.email?.trim() || null;
      if (updates.phone !== undefined) payload.phone = updates.phone.trim();
      if (updates.notes !== undefined) payload.notes = updates.notes?.trim() || null;

      const { data, error } = await supabase
        .from('company_saved_contacts')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar contato salvo:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update saved contact',
      };
    }
  }

  /**
   * Soft delete (desativar) um contato salvo
   */
  async deactivate(id: string): Promise<DBResponse<void>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('company_saved_contacts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('❌ Erro ao desativar contato salvo:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate saved contact',
      };
    }
  }

  /**
   * Verificar se um contato com mesmo telefone já existe na empresa
   */
  async findByPhone(companyId: string, phone: string): Promise<DBResponse<SavedContact | null>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('company_saved_contacts')
        .select('*')
        .eq('company_id', companyId)
        .eq('phone', phone.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find contact',
      };
    }
  }

  /**
   * Criar ou retornar contato existente (upsert por telefone)
   */
  async getOrCreate(contact: {
    company_id: string;
    name: string;
    email?: string | null;
    phone: string;
    created_by?: string | null;
  }): Promise<DBResponse<SavedContact>> {
    // Verificar se já existe
    const existing = await this.findByPhone(contact.company_id, contact.phone);
    if (existing.success && existing.data) {
      return { success: true, data: existing.data };
    }

    // Criar novo
    return this.create(contact);
  }
}

export class FreightContactRepository {
  /**
   * Buscar contatos responsáveis de um frete
   */
  async getByFreight(freightId: string): Promise<DBResponse<FreightResponsibleContact[]>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('freight_responsible_contacts')
        .select('*')
        .eq('freight_id', freightId)
        .order('is_main_contact', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar contatos do frete:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get freight contacts',
      };
    }
  }

  /**
   * Salvar contatos responsáveis de um frete
   * Remove contatos antigos e insere os novos
   */
  async setForFreight(
    freightId: string,
    contacts: Array<{
      name: string;
      email?: string | null;
      phone: string;
      isMainContact: boolean;
      source: 'collaborator' | 'manual' | 'saved_contact';
      sourceId?: string | null;
    }>
  ): Promise<DBResponse<FreightResponsibleContact[]>> {
    try {
      const supabase = getSupabaseClient();

      // 1. Remover contatos existentes do frete
      const { error: deleteError } = await supabase
        .from('freight_responsible_contacts')
        .delete()
        .eq('freight_id', freightId);

      if (deleteError) {
        console.error('❌ Erro ao limpar contatos do frete:', deleteError);
        return { success: false, error: deleteError.message };
      }

      // 2. Se não há contatos, retornar vazio
      if (!contacts || contacts.length === 0) {
        return { success: true, data: [] };
      }

      // 3. Inserir novos contatos
      const rows = contacts.map(c => ({
        freight_id: freightId,
        contact_name: c.name.trim(),
        contact_email: c.email?.trim() || null,
        contact_phone: c.phone.trim(),
        is_main_contact: c.isMainContact,
        source: c.source,
        source_id: c.sourceId || null,
      }));

      const { data, error } = await supabase
        .from('freight_responsible_contacts')
        .insert(rows)
        .select();

      if (error) {
        console.error('❌ Erro ao salvar contatos do frete:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ ${data.length} contatos vinculados ao frete ${freightId}`);
      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set freight contacts',
      };
    }
  }

  /**
   * Remover todos os contatos de um frete
   */
  async removeAll(freightId: string): Promise<DBResponse<void>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('freight_responsible_contacts')
        .delete()
        .eq('freight_id', freightId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove freight contacts',
      };
    }
  }
}

// Singletons
export const savedContactRepository = new SavedContactRepository();
export const freightContactRepository = new FreightContactRepository();
