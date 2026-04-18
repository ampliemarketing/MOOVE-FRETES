/**
 * Freight Validator - Validação de dados de fretes
 * 
 * Este módulo fornece funções para validar e normalizar dados de fretes
 * vindos do Supabase, garantindo que tenham estrutura válida antes de
 * serem usados na UI.
 * 
 * @module freight-validator
 */

import { isValidLocation, normalizeLocation } from './location-helpers';

export interface ValidatedFreight {
  id: string;
  origin: {
    city: string;
    state: string;
  };
  destination: {
    city: string;
    state: string;
  };
  [key: string]: any; // Outros campos passam através
}

export interface ValidatedRoute {
  id: string;
  origin: {
    city: string;
    state: string;
  };
  destination: {
    city: string;
    state: string;
  };
  driverId?: string;
  [key: string]: any;
}

/**
 * Valida e normaliza dados de frete
 * 
 * @param freight - Frete para validar
 * @param logInvalid - Se true, loga dados inválidos no console
 * @returns Frete validado ou null se inválido
 * 
 * @example
 * ```typescript
 * const freight = { id: '123', origin: { city: 'SP', state: 'SP' }, destination: null };
 * const validated = validateFreight(freight); // null (destination inválido)
 * ```
 */
export function validateFreight(freight: any, logInvalid: boolean = true): ValidatedFreight | null {
  // 1. Verificar se freight existe
  if (!freight) {
    if (logInvalid) {
    }
    return null;
  }
  
  // 2. Verificar ID
  if (!freight.id) {
    if (logInvalid) {
    }
    return null;
  }
  
  // 3. Validar origem
  if (!isValidLocation(freight.origin)) {
    if (logInvalid) {
    }
    return null;
  }
  
  // 4. Validar destino
  if (!isValidLocation(freight.destination)) {
    if (logInvalid) {
    }
    return null;
  }
  
  // 5. Normalizar e retornar
  const normalizedOrigin = normalizeLocation(freight.origin);
  const normalizedDestination = normalizeLocation(freight.destination);
  
  if (!normalizedOrigin || !normalizedDestination) {
    if (logInvalid) {
    }
    return null;
  }
  
  return {
    ...freight,
    origin: normalizedOrigin,
    destination: normalizedDestination
  } as ValidatedFreight;
}

/**
 * Valida array de fretes e remove inválidos
 * 
 * @param freights - Array de fretes (pode ser null/undefined/array vazio)
 * @param logInvalid - Se true, loga estatísticas de validação
 * @returns Array apenas com fretes válidos (sempre retorna array, nunca null)
 * 
 * @example
 * ```typescript
 * const freights = [
 *   { id: '1', origin: { city: 'SP', state: 'SP' }, destination: { city: 'RJ', state: 'RJ' } },
 *   { id: '2', origin: null, destination: null },
 *   null
 * ];
 * const validated = validateFreights(freights); // [{ id: '1', ... }]
 * 
 * // CASOS ESPECIAIS (sistema vazio):
 * validateFreights(null); // [] (array vazio)
 * validateFreights(undefined); // [] (array vazio)
 * validateFreights([]); // [] (array vazio)
 * ```
 */
export function validateFreights(freights: any[] | null | undefined, logInvalid: boolean = true): ValidatedFreight[] {
  // ✅ PROTEÇÃO: Input null/undefined
  if (freights == null) {
    if (logInvalid) {
    }
    return [];
  }
  
  // ✅ PROTEÇÃO: Verificar se é array
  if (!Array.isArray(freights)) {
    console.error('❌ [validateFreights] Input não é array:', typeof freights);
    return [];
  }
  
  // ✅ PROTEÇÃO: Array vazio (sistema sem dados)
  if (freights.length === 0) {
    if (logInvalid) {
    }
    return [];
  }
  
  // Validar cada frete
  const validated = freights
    .map(f => validateFreight(f, false)) // Não logar individualmente
    .filter((f): f is ValidatedFreight => f !== null);
  
  // Logar estatísticas
  const invalidCount = freights.length - validated.length;
  if (logInvalid && invalidCount > 0) {
    // [REVISAR] console.warn(
    // `⚠️ [validateFreights] ${invalidCount} frete(s) inválido(s) filtrado(s) de ${freights.length} total`,
    // {
    // total: freights.length,
    // valid: validated.length,
    // invalid: invalidCount,
    // percentage: ((invalidCount / freights.length) * 100).toFixed(1) + '%'
    // }
    // );
    
    // Detalhar problemas encontrados
    const invalidFreights = freights.filter(f => !validateFreight(f, false));
    const issues = {
      noId: invalidFreights.filter(f => f && !f.id).length,
      noOrigin: invalidFreights.filter(f => f && f.id && !isValidLocation(f.origin)).length,
      noDestination: invalidFreights.filter(f => f && f.id && !isValidLocation(f.destination)).length,
      nullUndefined: invalidFreights.filter(f => !f).length
    };
    
  }
  
  return validated;
}

/**
 * Valida dados de rota preferida
 * 
 * @param route - Rota para validar
 * @param logInvalid - Se true, loga dados inválidos
 * @returns Rota validada ou null se inválida
 */
export function validateRoute(route: any, logInvalid: boolean = true): ValidatedRoute | null {
  if (!route) {
    if (logInvalid) {
    }
    return null;
  }
  
  if (!route.id) {
    if (logInvalid) {
    }
    return null;
  }
  
  if (!isValidLocation(route.origin)) {
    if (logInvalid) {
    }
    return null;
  }
  
  if (!isValidLocation(route.destination)) {
    if (logInvalid) {
    }
    return null;
  }
  
  const normalizedOrigin = normalizeLocation(route.origin);
  const normalizedDestination = normalizeLocation(route.destination);
  
  if (!normalizedOrigin || !normalizedDestination) {
    return null;
  }
  
  return {
    ...route,
    origin: normalizedOrigin,
    destination: normalizedDestination
  } as ValidatedRoute;
}

/**
 * Valida array de rotas e remove inválidas
 * 
 * @param routes - Array de rotas (pode ser null/undefined/array vazio)
 * @param logInvalid - Se true, loga estatísticas
 * @returns Array apenas com rotas válidas (sempre retorna array, nunca null)
 */
export function validateRoutes(routes: any[] | null | undefined, logInvalid: boolean = true): ValidatedRoute[] {
  // ✅ PROTEÇÃO: Input null/undefined
  if (routes == null) {
    if (logInvalid) {
    }
    return [];
  }
  
  // ✅ PROTEÇÃO: Verificar se é array
  if (!Array.isArray(routes)) {
    console.error('❌ [validateRoutes] Input não é array:', typeof routes);
    return [];
  }
  
  // ✅ PROTEÇÃO: Array vazio (sistema sem dados)
  if (routes.length === 0) {
    if (logInvalid) {
    }
    return [];
  }
  
  const validated = routes
    .map(r => validateRoute(r, false))
    .filter((r): r is ValidatedRoute => r !== null);
  
  const invalidCount = routes.length - validated.length;
  if (logInvalid && invalidCount > 0) {
    // [REVISAR] console.warn(
    // `⚠️ [validateRoutes] ${invalidCount} rota(s) inválida(s) filtrada(s) de ${routes.length} total`
    // );
  }
  
  return validated;
}

/**
 * Verifica se objeto tem campos de localização válidos
 * 
 * @param obj - Objeto para verificar
 * @returns true se tem origin e destination válidos
 */
export function hasValidLocations(obj: any): boolean {
  return isValidLocation(obj?.origin) && isValidLocation(obj?.destination);
}

/**
 * Cria objeto de localização vazio/padrão
 * 
 * @returns Objeto de localização com valores N/A
 */
export function createEmptyLocation(): { city: string; state: string } {
  return { city: 'N/A', state: 'N/A' };
}

/**
 * Cria frete com dados padrão para campos faltantes
 * 
 * @param partialFreight - Frete parcial
 * @returns Frete com campos preenchidos
 */
export function createSafeFreight(partialFreight: any): ValidatedFreight | null {
  if (!partialFreight?.id) return null;
  
  const origin = isValidLocation(partialFreight.origin) 
    ? normalizeLocation(partialFreight.origin)!
    : createEmptyLocation();
    
  const destination = isValidLocation(partialFreight.destination)
    ? normalizeLocation(partialFreight.destination)!
    : createEmptyLocation();
  
  return {
    ...partialFreight,
    origin,
    destination
  } as ValidatedFreight;
}