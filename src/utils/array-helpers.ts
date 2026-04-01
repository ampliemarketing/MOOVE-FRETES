/**
 * Array Helpers - Funções utilitárias para manipulação segura de arrays
 * 
 * Este módulo fornece funções helper para trabalhar com arrays de forma segura,
 * prevenindo erros de null/undefined e filtrando dados inválidos automaticamente.
 * 
 * @module array-helpers
 */

/**
 * Map seguro que filtra valores null/undefined automaticamente
 * 
 * @param array - Array para mapear (pode ser null/undefined)
 * @param callback - Função de mapeamento
 * @returns Array mapeado (vazio se input inválido)
 * 
 * @example
 * ```typescript
 * const items = [null, { id: 1 }, undefined, { id: 2 }];
 * const ids = safeMap(items, item => item.id); // [1, 2]
 * 
 * const nullArray = null;
 * const result = safeMap(nullArray, item => item.id); // []
 * ```
 */
export function safeMap<T, R>(
  array: (T | null | undefined)[] | null | undefined,
  callback: (item: T, index: number, array: T[]) => R
): R[] {
  // Retornar array vazio se input inválido
  if (!array || !Array.isArray(array)) {
    return [];
  }
  
  // Filtrar null/undefined e mapear
  const validItems = array.filter((item): item is T => item !== null && item !== undefined);
  return validItems.map(callback);
}

/**
 * Filter + Map combinados de forma segura
 * 
 * @param array - Array para processar
 * @param validator - Função que valida cada item
 * @param mapper - Função de mapeamento
 * @returns Array filtrado e mapeado
 * 
 * @example
 * ```typescript
 * const users = [
 *   { name: 'João', age: 25 },
 *   { name: null, age: 30 },
 *   { name: 'Maria', age: 28 }
 * ];
 * 
 * const names = safeFilterMap(
 *   users,
 *   user => Boolean(user.name),
 *   user => user.name.toUpperCase()
 * ); // ['JOÃO', 'MARIA']
 * ```
 */
export function safeFilterMap<T, R>(
  array: T[] | null | undefined,
  validator: (item: T) => boolean,
  mapper: (item: T) => R
): R[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  
  return array.filter(validator).map(mapper);
}

/**
 * Find seguro que retorna null ao invés de undefined
 * 
 * @param array - Array onde buscar
 * @param predicate - Função de busca
 * @returns Item encontrado ou null
 */
export function safeFind<T>(
  array: T[] | null | undefined,
  predicate: (item: T) => boolean
): T | null {
  if (!array || !Array.isArray(array)) {
    return null;
  }
  
  return array.find(predicate) || null;
}

/**
 * Verifica se array não está vazio (com validação de null/undefined)
 * 
 * @param array - Array para verificar
 * @returns true se array existe e tem itens
 */
export function hasItems<T>(array: T[] | null | undefined): boolean {
  return Boolean(array && Array.isArray(array) && array.length > 0);
}

/**
 * Retorna comprimento seguro de array (0 se null/undefined)
 * 
 * @param array - Array
 * @returns Comprimento do array ou 0
 */
export function safeLength<T>(array: T[] | null | undefined): number {
  if (!array || !Array.isArray(array)) {
    return 0;
  }
  return array.length;
}

/**
 * Divide array em chunks de tamanho específico
 * 
 * @param array - Array para dividir
 * @param chunkSize - Tamanho de cada chunk
 * @returns Array de arrays
 */
export function chunk<T>(array: T[] | null | undefined, chunkSize: number): T[][] {
  if (!array || !Array.isArray(array) || chunkSize <= 0) {
    return [];
  }
  
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}

/**
 * Remove duplicatas de array baseado em uma chave
 * 
 * @param array - Array com possíveis duplicatas
 * @param keyFn - Função que extrai a chave de cada item
 * @returns Array sem duplicatas
 */
export function uniqueBy<T>(
  array: T[] | null | undefined,
  keyFn: (item: T) => any
): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Agrupa array por uma chave
 * 
 * @param array - Array para agrupar
 * @param keyFn - Função que extrai a chave
 * @returns Map com items agrupados
 */
export function groupBy<T>(
  array: T[] | null | undefined,
  keyFn: (item: T) => string
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  
  if (!array || !Array.isArray(array)) {
    return groups;
  }
  
  array.forEach(item => {
    const key = keyFn(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  });
  
  return groups;
}
