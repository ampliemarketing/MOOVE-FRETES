/**
 * Repositórios da camada de conformidade ANTT 2026.
 * CRUD direto no Supabase, seguindo o mesmo padrão de saved-contact-repository.ts.
 */

import { getSupabaseClient } from '../supabase/client';
import type { DBResponse } from '../database/schema';
import type {
  CiotOperationRecord,
  CiotProviderId,
  CiotStatus,
  InsurancePolicyRecord,
  InsurancePolicyType,
  InsuranceStatus,
  MdfeRecord,
  OperationType,
  OwnerType,
  RntrcStatus,
  RntrcVerificationRecord,
  ValePedagioProviderId,
  ValePedagioRecord,
  ValePedagioStatus,
} from './types';

function mapInsuranceRow(row: any): InsurancePolicyRecord {
  return {
    id: row.id,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    policyType: row.policy_type,
    insurerName: row.insurer_name,
    policyNumber: row.policy_number,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    status: row.status,
    documentUrl: row.document_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class InsurancePolicyRepository {
  async getByOwner(ownerType: OwnerType, ownerId: string): Promise<DBResponse<InsurancePolicyRecord[]>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('owner_type', ownerType)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) return { success: false, error: error.message };
      return { success: true, data: (data || []).map(mapInsuranceRow) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get insurance policies' };
    }
  }

  /** Retorna, para cada um dos 3 tipos obrigatórios, o registro mais recente (ou null). */
  async getCurrentMandatoryPolicies(
    ownerType: OwnerType,
    ownerId: string
  ): Promise<DBResponse<Record<InsurancePolicyType, InsurancePolicyRecord | null>>> {
    const result = await this.getByOwner(ownerType, ownerId);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }
    const byType: Record<string, InsurancePolicyRecord | null> = {
      'RCTR-C': null,
      'RC-DC': null,
      'RC-V': null,
    };
    for (const policy of result.data) {
      if (!byType[policy.policyType]) byType[policy.policyType] = policy;
    }
    return { success: true, data: byType as Record<InsurancePolicyType, InsurancePolicyRecord | null> };
  }

  async upsert(policy: {
    ownerType: OwnerType;
    ownerId: string;
    policyType: InsurancePolicyType;
    insurerName?: string | null;
    policyNumber?: string | null;
    validFrom?: string | null;
    validUntil: string;
    documentUrl?: string | null;
  }): Promise<DBResponse<InsurancePolicyRecord>> {
    try {
      const supabase = getSupabaseClient();
      const isExpired = new Date(policy.validUntil) < new Date();
      const { data, error } = await supabase
        .from('insurance_policies')
        .insert({
          owner_type: policy.ownerType,
          owner_id: policy.ownerId,
          policy_type: policy.policyType,
          insurer_name: policy.insurerName || null,
          policy_number: policy.policyNumber || null,
          valid_from: policy.validFrom || null,
          valid_until: policy.validUntil,
          document_url: policy.documentUrl || null,
          status: isExpired ? 'expired' : 'pending_verification',
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: mapInsuranceRow(data) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to save insurance policy' };
    }
  }

  async verify(id: string, status: InsuranceStatus, verifiedBy: string, notes?: string): Promise<DBResponse<void>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('insurance_policies')
        .update({
          status,
          verified_by: verifiedBy,
          verified_at: new Date().toISOString(),
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to verify insurance policy' };
    }
  }
}

export class RntrcVerificationRepository {
  async getLatest(ownerType: OwnerType, ownerId: string): Promise<DBResponse<RntrcVerificationRecord | null>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('rntrc_verifications')
        .select('*')
        .eq('owner_type', ownerType)
        .eq('owner_id', ownerId)
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (!data) return { success: true, data: null };

      return {
        success: true,
        data: {
          id: data.id,
          ownerType: data.owner_type,
          ownerId: data.owner_id,
          rntrcNumber: data.rntrc_number,
          status: data.status,
          method: data.method,
          checkedAt: data.checked_at,
          notes: data.notes,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get RNTRC verification' };
    }
  }

  /** Registra uma verificação manual (feita por admin) — ainda não há webservice ANTT plugado. */
  async recordManualVerification(params: {
    ownerType: OwnerType;
    ownerId: string;
    rntrcNumber: string;
    status: RntrcStatus;
    checkedBy: string;
    notes?: string;
  }): Promise<DBResponse<void>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('rntrc_verifications').insert({
        owner_type: params.ownerType,
        owner_id: params.ownerId,
        rntrc_number: params.rntrcNumber,
        status: params.status,
        method: 'manual_admin',
        checked_by: params.checkedBy,
        notes: params.notes || null,
      });

      if (error) return { success: false, error: error.message };

      // Espelha o status na tabela de origem (companies/drivers) para consultas rápidas
      const table = params.ownerType === 'company' ? 'companies' : 'drivers';
      await supabase.from(table).update({ rntrc_status: params.status }).eq('id', params.ownerId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to record RNTRC verification' };
    }
  }
}

function mapCiotRow(row: any): CiotOperationRecord {
  return {
    id: row.id,
    freightId: row.freight_id,
    ciotNumber: row.ciot_number,
    status: row.status,
    provider: row.provider,
    operationType: row.operation_type,
    valorOperacao: row.valor_operacao,
    pisoMinimoAplicavel: row.piso_minimo_aplicavel,
    generatedAt: row.generated_at,
    blockedReason: row.blocked_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CiotRepository {
  async getByFreight(freightId: string): Promise<DBResponse<CiotOperationRecord | null>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('ciot_operations')
        .select('*')
        .eq('freight_id', freightId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      return { success: true, data: data ? mapCiotRow(data) : null };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get CIOT operation' };
    }
  }

  async createOrUpdate(params: {
    freightId: string;
    status: CiotStatus;
    provider: CiotProviderId;
    operationType?: OperationType | null;
    valorOperacao?: number | null;
    pisoMinimoAplicavel?: number | null;
    ciotNumber?: string | null;
    blockedReason?: string | null;
    generatedBy?: string | null;
  }): Promise<DBResponse<CiotOperationRecord>> {
    try {
      const supabase = getSupabaseClient();
      const existing = await this.getByFreight(params.freightId);
      const payload = {
        freight_id: params.freightId,
        status: params.status,
        provider: params.provider,
        operation_type: params.operationType ?? null,
        valor_operacao: params.valorOperacao ?? null,
        piso_minimo_aplicavel: params.pisoMinimoAplicavel ?? null,
        ciot_number: params.ciotNumber ?? null,
        blocked_reason: params.blockedReason ?? null,
        generated_at: params.status === 'generated' ? new Date().toISOString() : null,
        generated_by: params.generatedBy ?? null,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (existing.success && existing.data) {
        result = await supabase.from('ciot_operations').update(payload).eq('id', existing.data.id).select().single();
      } else {
        result = await supabase.from('ciot_operations').insert(payload).select().single();
      }

      if (result.error) return { success: false, error: result.error.message };

      // Espelha o status no frete para consulta rápida em listagens
      await supabase.from('freights').update({ ciot_status: params.status }).eq('id', params.freightId);

      return { success: true, data: mapCiotRow(result.data) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to save CIOT operation' };
    }
  }
}

export class MdfeRepository {
  async getByFreight(freightId: string): Promise<DBResponse<MdfeRecord | null>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('mdfe_records')
        .select('*')
        .eq('freight_id', freightId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (!data) return { success: true, data: null };

      return {
        success: true,
        data: {
          id: data.id,
          freightId: data.freight_id,
          numeroMdfe: data.numero_mdfe,
          chaveAcesso: data.chave_acesso,
          status: data.status,
          ciotOperationId: data.ciot_operation_id,
          issuedAt: data.issued_at,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get MDF-e record' };
    }
  }

  async registerManualMdfe(params: {
    freightId: string;
    numeroMdfe: string;
    chaveAcesso?: string | null;
    ciotOperationId?: string | null;
    issuedBy: string;
  }): Promise<DBResponse<void>> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('mdfe_records').insert({
        freight_id: params.freightId,
        numero_mdfe: params.numeroMdfe,
        chave_acesso: params.chaveAcesso || null,
        status: 'issued',
        ciot_operation_id: params.ciotOperationId || null,
        issued_at: new Date().toISOString(),
        issued_by: params.issuedBy,
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to register MDF-e' };
    }
  }
}

export class ValePedagioRepository {
  async getByFreight(freightId: string): Promise<DBResponse<ValePedagioRecord | null>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('vale_pedagio_records')
        .select('*')
        .eq('freight_id', freightId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (!data) return { success: true, data: null };

      return {
        success: true,
        data: {
          id: data.id,
          freightId: data.freight_id,
          provider: data.provider,
          tagNumber: data.tag_number,
          valor: data.valor,
          status: data.status,
          registeredAt: data.registered_at,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get vale-pedágio record' };
    }
  }

  async register(params: {
    freightId: string;
    provider: ValePedagioProviderId;
    tagNumber?: string | null;
    valor?: number | null;
    status?: ValePedagioStatus;
  }): Promise<DBResponse<void>> {
    try {
      const supabase = getSupabaseClient();
      const status = params.status || (params.provider === 'pending_integration' ? 'pending' : 'registered');
      const { error } = await supabase.from('vale_pedagio_records').insert({
        freight_id: params.freightId,
        provider: params.provider,
        tag_number: params.tagNumber || null,
        valor: params.valor ?? null,
        status,
        registered_at: status === 'registered' ? new Date().toISOString() : null,
      });

      if (error) return { success: false, error: error.message };

      await supabase.from('freights').update({ vale_pedagio_status: status }).eq('id', params.freightId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to register vale-pedágio' };
    }
  }
}

export const insurancePolicyRepository = new InsurancePolicyRepository();
export const rntrcVerificationRepository = new RntrcVerificationRepository();
export const ciotRepository = new CiotRepository();
export const mdfeRepository = new MdfeRepository();
export const valePedagioRepository = new ValePedagioRepository();
