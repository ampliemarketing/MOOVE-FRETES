/**
 * Serviço de agregação de conformidade ANTT — RNTRC, seguros obrigatórios e
 * status de CIOT/MDF-e/vale-pedágio por frete. Usado pela Central de
 * Conformidade do usuário e pelo painel de compliance do admin.
 */

import { getSupabaseClient } from '../supabase/client';
import { insurancePolicyRepository, ciotRepository, mdfeRepository, valePedagioRepository } from './repositories';
import { MANDATORY_INSURANCE_TYPES, type InsurancePolicyType, type OwnerType, type RntrcStatus } from './types';

export const EXPIRY_WARNING_DAYS = 30;

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  if (isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

export type ItemStatus = 'ok' | 'expiring_soon' | 'expired' | 'missing' | 'pending_verification' | 'blocked';

export interface RntrcSummary {
  status: RntrcStatus;
  rntrcNumber: string | null;
  expiry: string | null;
  itemStatus: ItemStatus;
}

export async function getRntrcSummary(ownerType: OwnerType, ownerId: string): Promise<RntrcSummary> {
  const supabase = getSupabaseClient();
  const table = ownerType === 'company' ? 'companies' : 'drivers';
  const { data } = await supabase.from(table).select('rntrc, rntrc_expiry, rntrc_status').eq('id', ownerId).maybeSingle();

  const status: RntrcStatus = (data?.rntrc_status as RntrcStatus) || 'pendente_verificacao';
  const expiry = data?.rntrc_expiry || null;
  const remaining = daysUntil(expiry);

  let itemStatus: ItemStatus = 'pending_verification';
  if (!data?.rntrc) itemStatus = 'missing';
  else if (status === 'cancelado' || status === 'suspenso') itemStatus = 'blocked';
  else if (remaining !== null && remaining < 0) itemStatus = 'expired';
  else if (remaining !== null && remaining <= EXPIRY_WARNING_DAYS) itemStatus = 'expiring_soon';
  else if (status === 'ativo') itemStatus = 'ok';

  return { status, rntrcNumber: data?.rntrc || null, expiry, itemStatus };
}

export interface InsuranceSummaryItem {
  policyType: InsurancePolicyType;
  itemStatus: ItemStatus;
  validUntil: string | null;
}

export interface InsuranceSummary {
  items: InsuranceSummaryItem[];
  overallStatus: ItemStatus;
}

export async function getInsuranceSummary(ownerType: OwnerType, ownerId: string): Promise<InsuranceSummary> {
  const result = await insurancePolicyRepository.getCurrentMandatoryPolicies(ownerType, ownerId);
  const byType = result.data || { 'RCTR-C': null, 'RC-DC': null, 'RC-V': null };

  const items: InsuranceSummaryItem[] = MANDATORY_INSURANCE_TYPES.map((policyType) => {
    const policy = byType[policyType];
    if (!policy) return { policyType, itemStatus: 'missing', validUntil: null };

    const remaining = daysUntil(policy.validUntil);
    let itemStatus: ItemStatus = 'pending_verification';
    if (policy.status === 'rejected') itemStatus = 'blocked';
    else if (remaining !== null && remaining < 0) itemStatus = 'expired';
    else if (remaining !== null && remaining <= EXPIRY_WARNING_DAYS) itemStatus = 'expiring_soon';
    else if (policy.status === 'active') itemStatus = 'ok';

    return { policyType, itemStatus, validUntil: policy.validUntil };
  });

  const priority: ItemStatus[] = ['blocked', 'missing', 'expired', 'expiring_soon', 'pending_verification', 'ok'];
  const overallStatus = priority.find((p) => items.some((i) => i.itemStatus === p)) || 'ok';

  return { items, overallStatus };
}

export interface FreightComplianceSummary {
  ciotStatus: string;
  ciotNumber: string | null;
  mdfeStatus: string;
  valePedagioStatus: string;
  pisoMinimoValor: number | null;
  abaixoDoPiso: boolean;
  /** Verdadeiro apenas quando CIOT + MDF-e estão emitidos e o valor não está abaixo do piso. */
  readyForTransit: boolean;
}

export async function getFreightComplianceSummary(freightId: string): Promise<FreightComplianceSummary> {
  const [ciot, mdfe, valePedagio] = await Promise.all([
    ciotRepository.getByFreight(freightId),
    mdfeRepository.getByFreight(freightId),
    valePedagioRepository.getByFreight(freightId),
  ]);

  const ciotStatus = ciot.data?.status || 'pending';
  const mdfeStatus = mdfe.data?.status || 'not_issued';
  const valePedagioStatus = valePedagio.data?.status || 'pending';

  return {
    ciotStatus,
    ciotNumber: ciot.data?.ciotNumber || null,
    mdfeStatus,
    valePedagioStatus,
    pisoMinimoValor: ciot.data?.pisoMinimoAplicavel ?? null,
    abaixoDoPiso: ciotStatus === 'blocked_below_piso',
    readyForTransit: ciotStatus === 'generated' && mdfeStatus === 'issued',
  };
}

/** Resumo simples para exibir badges/pendências em listagens (empresa ou motorista). */
export async function getComplianceOverview(ownerType: OwnerType, ownerId: string) {
  const [rntrc, insurance] = await Promise.all([
    getRntrcSummary(ownerType, ownerId),
    getInsuranceSummary(ownerType, ownerId),
  ]);

  const pendingCount =
    (rntrc.itemStatus !== 'ok' ? 1 : 0) + insurance.items.filter((i) => i.itemStatus !== 'ok').length;

  return { rntrc, insurance, pendingCount, isFullyCompliant: pendingCount === 0 };
}
