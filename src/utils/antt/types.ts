/**
 * Tipos compartilhados da camada de conformidade ANTT 2026
 * (MP 1.343/2026, Resoluções ANTT 6.076, 6.077, 6.078/2026)
 */

export type OperationType =
  | 'TAC'                    // Transportador Autônomo de Cargas
  | 'TAC_AGREGADO'           // TAC com vínculo exclusivo de 10-30 dias por CIOT
  | 'ETC_FROTA_PROPRIA'      // Empresa de Transporte de Cargas operando frota própria
  | 'ETC_SUBCONTRATACAO'     // ETC subcontratando um TAC
  | 'CTC';                   // Cooperativa de Transporte de Cargas

export type LoadClassification = 'lotacao' | 'fracionada';

export type RntrcStatus = 'ativo' | 'suspenso' | 'cancelado' | 'pendente_verificacao';

export type InsurancePolicyType = 'RCTR-C' | 'RC-DC' | 'RC-V';
export const MANDATORY_INSURANCE_TYPES: InsurancePolicyType[] = ['RCTR-C', 'RC-DC', 'RC-V'];

export type InsuranceStatus = 'pending_verification' | 'active' | 'expired' | 'rejected';

export type CiotStatus =
  | 'not_required'
  | 'pending'
  | 'blocked_below_piso'
  | 'manual_pending'
  | 'generated'
  | 'cancelled';

export type CiotProviderId =
  | 'roadcard'
  | 'truckpad'
  | 'fretebras'
  | 'repom'
  | 'sem_parar'
  | 'bbc_digital'
  | 'mercado_pago'
  | 'manual'
  | 'pending_integration';

export type ValePedagioProviderId =
  | 'sem_parar'
  | 'repom'
  | 'conectcar'
  | 'bbc_digital'
  | 'via_facil'
  | 'move_mais'
  | 'manual'
  | 'pending_integration';

export type ValePedagioStatus = 'pending' | 'registered' | 'not_applicable';

export type MdfeStatus = 'not_issued' | 'issued' | 'cancelled';

export type PaymentAccountType = 'propria' | 'terceiro_autorizado';

export type OwnerType = 'company' | 'driver';

export interface PisoMinimoCoefficient {
  id: string;
  categoriaCarga: string;
  tabela: 'A' | 'B' | 'C' | 'D';
  eixos: number;
  ccd: number;
  cc: number;
  fonte: string | null;
  needsVerification: boolean;
  vigenteDesde: string;
}

export interface PisoMinimoResult {
  valor: number;
  categoriaCarga: string;
  eixosConsiderados: number;
  ccdUsado: number;
  ccUsado: number;
  distanciaKm: number;
  needsVerification: boolean;
  fonte: string | null;
}

export interface InsurancePolicyRecord {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  policyType: InsurancePolicyType;
  insurerName: string | null;
  policyNumber: string | null;
  validFrom: string | null;
  validUntil: string;
  status: InsuranceStatus;
  documentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RntrcVerificationRecord {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  rntrcNumber: string | null;
  status: RntrcStatus;
  method: 'manual_admin' | 'webservice_pending';
  checkedAt: string;
  notes: string | null;
}

export interface CiotOperationRecord {
  id: string;
  freightId: string;
  ciotNumber: string | null;
  status: CiotStatus;
  provider: CiotProviderId;
  operationType: OperationType | null;
  valorOperacao: number | null;
  pisoMinimoAplicavel: number | null;
  generatedAt: string | null;
  blockedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MdfeRecord {
  id: string;
  freightId: string;
  numeroMdfe: string | null;
  chaveAcesso: string | null;
  status: MdfeStatus;
  ciotOperationId: string | null;
  issuedAt: string | null;
}

export interface ValePedagioRecord {
  id: string;
  freightId: string;
  provider: ValePedagioProviderId;
  tagNumber: string | null;
  valor: number | null;
  status: ValePedagioStatus;
  registeredAt: string | null;
}

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  TAC: 'Transportador Autônomo (TAC)',
  TAC_AGREGADO: 'TAC Agregado (vínculo exclusivo)',
  ETC_FROTA_PROPRIA: 'ETC — Frota própria',
  ETC_SUBCONTRATACAO: 'ETC — Subcontratação de TAC',
  CTC: 'Cooperativa de Transporte (CTC)',
};

export const CIOT_PROVIDER_LABELS: Record<CiotProviderId, string> = {
  roadcard: 'Roadcard (Pamcard)',
  truckpad: 'TruckPad',
  fretebras: 'FreteBras',
  repom: 'Repom',
  sem_parar: 'Sem Parar',
  bbc_digital: 'BBC Digital',
  mercado_pago: 'Mercado Pago',
  manual: 'CIOT obtido manualmente (fora da plataforma)',
  pending_integration: 'Integração automática pendente de contratação',
};

export const VALE_PEDAGIO_PROVIDER_LABELS: Record<ValePedagioProviderId, string> = {
  sem_parar: 'Sem Parar',
  repom: 'Repom',
  conectcar: 'ConectCar',
  bbc_digital: 'BBC Digital',
  via_facil: 'Via Fácil',
  move_mais: 'Move Mais',
  manual: 'Registrado manualmente (fora da plataforma)',
  pending_integration: 'Integração automática pendente de contratação',
};
