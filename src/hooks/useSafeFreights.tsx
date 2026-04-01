/**
 * useSafeFreights - Hook wrapper que valida dados de fretes automaticamente
 * 
 * Este hook é um wrapper ao redor de useFreights que:
 * 1. Valida todos os fretes retornados
 * 2. Remove automaticamente fretes com dados NULL
 * 3. Loga estatísticas de validação
 * 4. Retorna apenas fretes válidos
 * 
 * @example
 * ```typescript
 * // Ao invés de usar:
 * const { freights, loading } = useFreights();
 * 
 * // Use:
 * const { freights, loading, invalidCount } = useSafeFreights();
 * // freights agora é garantido que não tem origin/destination NULL
 * ```
 */

import { useMemo } from 'react';
import { useFreights } from '../utils/database/hooks';
import { validateFreights, type ValidatedFreight } from '../utils/freight-validator';

interface UseSafeFreightsResult {
  freights: ValidatedFreight[];
  loading: boolean;
  error: any;
  invalidCount: number;
  totalCount: number;
  validPercentage: number;
}

export function useSafeFreights(): UseSafeFreightsResult {
  // Hook original
  const { freights: rawFreights, loading, error } = useFreights();

  // Validar e filtrar fretes
  const { freights, invalidCount, totalCount } = useMemo(() => {
    const total = rawFreights?.length || 0;
    
    // Se não há fretes, retornar vazio
    if (!rawFreights || total === 0) {
      return {
        freights: [],
        invalidCount: 0,
        totalCount: 0
      };
    }

    // Validar todos os fretes
    const validated = validateFreights(rawFreights, true);
    const invalid = total - validated.length;

    return {
      freights: validated,
      invalidCount: invalid,
      totalCount: total
    };
  }, [rawFreights]);

  // Calcular porcentagem de válidos
  const validPercentage = useMemo(() => {
    if (totalCount === 0) return 100;
    return ((freights.length / totalCount) * 100);
  }, [freights.length, totalCount]);

  return {
    freights,
    loading,
    error,
    invalidCount,
    totalCount,
    validPercentage
  };
}

/**
 * useSafeFreightsWithStats - Versão que retorna estatísticas detalhadas
 */
export function useSafeFreightsWithStats() {
  const result = useSafeFreights();

  // Estatísticas adicionais
  const stats = useMemo(() => {
    return {
      total: result.totalCount,
      valid: result.freights.length,
      invalid: result.invalidCount,
      validPercentage: result.validPercentage,
      hasInvalidData: result.invalidCount > 0,
      isEmpty: result.totalCount === 0
    };
  }, [result]);

  return {
    ...result,
    stats
  };
}
