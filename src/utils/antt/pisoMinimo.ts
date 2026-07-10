/**
 * Motor de cálculo do piso mínimo do frete (Resolução ANTT 5.867/2020,
 * alterada pela Resolução 6.076/2026).
 *
 * Fórmula oficial (operação simples, Tabela A — composição veicular completa):
 *   Piso (R$) = (distância_km × CCD) + CC
 *
 * Os coeficientes CCD/CC vêm da tabela `piso_minimo_coefficients` (editável pelo
 * admin, pois mudam por "gatilho do diesel" várias vezes ao ano). Este módulo só
 * faz a conta — a fonte da verdade dos números fica no banco.
 */

import { getSupabaseClient } from '../supabase/client';
import type { PisoMinimoCoefficient, PisoMinimoResult } from './types';

/** Mapa: rótulo de "Tipo de Carga" usado no formulário -> categoria regulatória ANTT */
export const CARGO_TYPE_TO_CATEGORIA: Record<string, string> = {
  'Carga Geral': 'carga_geral',
  'Granel sólido': 'granel_solido',
  'Granel líquido': 'granel_liquido',
  'Granel pressurizada': 'granel_pressurizada',
  'Conteiner': 'conteinerizada',
  'Frigorificada ou Aquecida': 'frigorificada',
  'Neogranel': 'neogranel',
  'Perigosa (Carga Geral)': 'perigosa_carga_geral',
  'Perigosa (Granel sólido)': 'perigosa_granel_solido',
  'Perigosa (Granel liquido)': 'perigosa_granel_liquido',
  'Perigosa (Container)': 'perigosa_conteinerizada',
  'Perigosa (Frigorificada ou Aquecida)': 'perigosa_frigorificada',
};

/**
 * Nº de eixos típico por configuração de veículo/carreta.
 * Aproximação de mercado (não é um dado regulatório fechado, pois o eixo real
 * depende da placa específica) — usada apenas para estimar o piso quando o
 * frete ainda não tem um veículo/motorista definitivo vinculado.
 */
export const VEHICLE_AXLE_ESTIMATE: Record<string, number> = {
  // Leves
  'Fiorino': 2, 'VLC': 2, '3/4': 2, 'Toco': 2,
  // Médios
  'Bitruck': 3, 'Truck': 3,
  // Pesados / carretas
  'Carreta': 5, 'Bitrem': 7, 'Rodotrem': 9, 'Vanderléia': 6, 'Carreta LS': 6,
  // Carrocerias (quando o "veículo" informado é a carroceria)
  'Baú': 4, 'Baú Frigorífico': 4, 'Baú Refrigerado': 4, 'Sider': 4,
  'Caçamba': 4, 'Grade Baixa': 5, 'Graneleiro': 5, 'Plataforma': 5, 'Prancha': 6,
  'Apenas Cavalo': 2, 'Bug Porta Container': 6, 'Cavaqueira': 5, 'Cegonheiro': 6,
  'Gaiola': 4, 'Hopper': 5, 'Munck': 3, 'Silo': 5, 'Tanque': 5,
};

const VALID_EIXOS = [2, 3, 4, 5, 6, 7, 9];

function nearestValidEixos(n: number): number {
  return VALID_EIXOS.reduce((best, v) => (Math.abs(v - n) < Math.abs(best - n) ? v : best), VALID_EIXOS[0]);
}

/**
 * Estima o nº de eixos "mais exigente" entre os veículos/carrocerias selecionados
 * no anúncio do frete. Usar o maior eixo entre as opções evita que o sistema
 * calcule (e libere) um piso mínimo mais baixo do que o exigido para o veículo
 * que efetivamente vier a realizar o transporte.
 */
export function estimateEixosFromVehicles(vehicleLabels: string[]): number {
  if (!vehicleLabels || vehicleLabels.length === 0) return 2;
  const candidates = vehicleLabels
    .map((label) => VEHICLE_AXLE_ESTIMATE[label])
    .filter((v): v is number => typeof v === 'number');
  if (candidates.length === 0) return 2;
  return nearestValidEixos(Math.max(...candidates));
}

let coefficientsCache: PisoMinimoCoefficient[] | null = null;
let coefficientsCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchPisoMinimoCoefficients(forceRefresh = false): Promise<PisoMinimoCoefficient[]> {
  if (!forceRefresh && coefficientsCache && Date.now() - coefficientsCacheAt < CACHE_TTL_MS) {
    return coefficientsCache;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('piso_minimo_coefficients')
    .select('*');

  if (error || !data) {
    console.error('❌ Erro ao buscar coeficientes de piso mínimo:', error);
    return coefficientsCache || [];
  }

  coefficientsCache = data.map((row: any) => ({
    id: row.id,
    categoriaCarga: row.categoria_carga,
    tabela: row.tabela,
    eixos: row.eixos,
    ccd: Number(row.ccd),
    cc: Number(row.cc),
    fonte: row.fonte,
    needsVerification: row.needs_verification,
    vigenteDesde: row.vigente_desde,
  }));
  coefficientsCacheAt = Date.now();
  return coefficientsCache;
}

interface CalculatePisoParams {
  cargoTypeLabel: string; // valor de FreightData.cargoType (ex.: "Carga Geral")
  vehicleLabels: string[]; // veículos/carrocerias selecionados no anúncio
  distanceKm: number;
  tabela?: 'A' | 'B' | 'C' | 'D';
}

/**
 * Calcula o piso mínimo do frete. Retorna `null` quando não há distância
 * conhecida (o cálculo depende de d × CCD + CC) — nesse caso o chamador deve
 * tratar como "piso não verificável ainda", não como "abaixo do piso".
 */
export async function calculatePisoMinimo({
  cargoTypeLabel,
  vehicleLabels,
  distanceKm,
  tabela = 'A',
}: CalculatePisoParams): Promise<PisoMinimoResult | null> {
  if (!distanceKm || distanceKm <= 0) return null;

  const categoriaCarga = CARGO_TYPE_TO_CATEGORIA[cargoTypeLabel] || 'carga_geral';
  const eixos = estimateEixosFromVehicles(vehicleLabels);

  const coefficients = await fetchPisoMinimoCoefficients();
  let row = coefficients.find(
    (c) => c.categoriaCarga === categoriaCarga && c.tabela === tabela && c.eixos === eixos
  );

  // fallback: categoria carga_geral no mesmo nº de eixos, se a categoria específica não estiver cadastrada
  if (!row) {
    row = coefficients.find((c) => c.categoriaCarga === 'carga_geral' && c.tabela === tabela && c.eixos === eixos);
  }
  // fallback final: qualquer linha carga_geral tabela A (evita ausência total de piso)
  if (!row) {
    row = coefficients.find((c) => c.categoriaCarga === 'carga_geral' && c.tabela === 'A');
  }
  if (!row) return null;

  const valor = distanceKm * row.ccd + row.cc;

  return {
    valor: Math.round(valor * 100) / 100,
    categoriaCarga: row.categoriaCarga,
    eixosConsiderados: row.eixos,
    ccdUsado: row.ccd,
    ccUsado: row.cc,
    distanciaKm: distanceKm,
    needsVerification: row.needsVerification,
    fonte: row.fonte,
  };
}

export function parseCurrencyToNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3},)/g, '');
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}
