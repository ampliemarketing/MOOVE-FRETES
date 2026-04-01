/**
 * Location Helpers - Funções utilitárias para manipulação segura de localizações
 * 
 * Este módulo fornece funções helper para trabalhar com dados de localização (city/state)
 * de forma segura, prevenindo erros de null/undefined.
 * 
 * @module location-helpers
 */

export interface Location {
  city: string | null | undefined;
  state: string | null | undefined;
}

/**
 * Formata localização com proteção contra null/undefined
 * 
 * @param location - Objeto com city e state
 * @param fallback - Valor padrão se dados inválidos (default: 'N/A')
 * @param separator - Separador entre city e state (default: ', ')
 * @returns String formatada "Cidade, UF" ou fallback
 * 
 * @example
 * ```typescript
 * formatLocation({ city: 'São Paulo', state: 'SP' }) // "São Paulo, SP"
 * formatLocation({ city: null, state: 'SP' }) // "N/A"
 * formatLocation(null) // "N/A"
 * formatLocation({ city: 'Rio', state: 'RJ' }, 'Indefinido', '/') // "Rio/RJ"
 * ```
 */
export function formatLocation(
  location: Location | null | undefined,
  fallback: string = 'N/A',
  separator: string = ', '
): string {
  // Verificar se location existe e tem dados válidos
  if (!location) return fallback;
  if (!location.city || !location.state) return fallback;
  
  // Retornar formatado
  return `${location.city}${separator}${location.state}`;
}

/**
 * Formata localização com barra como separador (usado em APIs/URLs)
 * 
 * @param location - Objeto com city e state
 * @param fallback - Valor padrão se dados inválidos (default: 'N/A')
 * @returns String formatada "Cidade/UF" ou fallback
 * 
 * @example
 * ```typescript
 * formatLocationSlash({ city: 'São Paulo', state: 'SP' }) // "São Paulo/SP"
 * ```
 */
export function formatLocationSlash(
  location: Location | null | undefined,
  fallback: string = 'N/A'
): string {
  return formatLocation(location, fallback, '/');
}

/**
 * Formata rota com origem e destino
 * 
 * @param origin - Localização de origem
 * @param destination - Localização de destino
 * @param fallback - Valor padrão se dados inválidos
 * @param separator - Separador entre origem e destino (default: ' → ')
 * @returns String formatada "Origem → Destino" ou fallback
 * 
 * @example
 * ```typescript
 * const origin = { city: 'São Paulo', state: 'SP' };
 * const destination = { city: 'Rio de Janeiro', state: 'RJ' };
 * formatRoute(origin, destination) // "São Paulo, SP → Rio de Janeiro, RJ"
 * ```
 */
export function formatRoute(
  origin: Location | null | undefined,
  destination: Location | null | undefined,
  fallback: string = 'Rota não definida',
  separator: string = ' → '
): string {
  const originStr = formatLocation(origin, 'Origem desconhecida');
  const destinationStr = formatLocation(destination, 'Destino desconhecido');
  
  // Se ambos inválidos, retornar fallback
  if (originStr === 'Origem desconhecida' && destinationStr === 'Destino desconhecido') {
    return fallback;
  }
  
  // Se um dos dois é válido, mostrar
  return `${originStr}${separator}${destinationStr}`;
}

/**
 * Formata rota com barra como separador (usado em mensagens/compartilhamento)
 * 
 * @param origin - Localização de origem
 * @param destination - Localização de destino
 * @param fallback - Valor padrão se dados inválidos
 * @returns String formatada "Origem/UF → Destino/UF" ou fallback
 * 
 * @example
 * ```typescript
 * formatRouteSlash(origin, destination) // "São Paulo/SP → Rio de Janeiro/RJ"
 * ```
 */
export function formatRouteSlash(
  origin: Location | null | undefined,
  destination: Location | null | undefined,
  fallback: string = 'Rota não definida'
): string {
  const originStr = formatLocationSlash(origin, 'Origem desconhecida');
  const destinationStr = formatLocationSlash(destination, 'Destino desconhecido');
  
  if (originStr === 'Origem desconhecida' && destinationStr === 'Destino desconhecido') {
    return fallback;
  }
  
  return `${originStr} → ${destinationStr}`;
}

/**
 * Verifica se localização é válida (tem city e state preenchidos)
 * 
 * @param location - Localização para verificar
 * @returns true se location tem city e state válidos
 * 
 * @example
 * ```typescript
 * isValidLocation({ city: 'São Paulo', state: 'SP' }) // true
 * isValidLocation({ city: null, state: 'SP' }) // false
 * isValidLocation(null) // false
 * ```
 */
export function isValidLocation(location: Location | null | undefined): location is Location {
  return Boolean(
    location && 
    location.city && 
    location.state &&
    location.city.trim() !== '' &&
    location.state.trim() !== ''
  );
}

/**
 * Extrai apenas cidade de uma localização (com fallback seguro)
 * 
 * @param location - Localização
 * @param fallback - Valor padrão se inválido
 * @returns Nome da cidade ou fallback
 */
export function getCity(
  location: Location | null | undefined,
  fallback: string = 'N/A'
): string {
  return location?.city || fallback;
}

/**
 * Extrai apenas estado de uma localização (com fallback seguro)
 * 
 * @param location - Localização
 * @param fallback - Valor padrão se inválido
 * @returns Sigla do estado ou fallback
 */
export function getState(
  location: Location | null | undefined,
  fallback: string = 'N/A'
): string {
  return location?.state || fallback;
}

/**
 * Compara duas localizações (case-insensitive)
 * 
 * @param location1 - Primeira localização
 * @param location2 - Segunda localização
 * @returns true se ambas têm mesma city e state
 * 
 * @example
 * ```typescript
 * const loc1 = { city: 'São Paulo', state: 'SP' };
 * const loc2 = { city: 'são paulo', state: 'sp' };
 * isSameLocation(loc1, loc2) // true
 * ```
 */
export function isSameLocation(
  location1: Location | null | undefined,
  location2: Location | null | undefined
): boolean {
  if (!isValidLocation(location1) || !isValidLocation(location2)) {
    return false;
  }
  
  return (
    location1.city.toLowerCase() === location2.city.toLowerCase() &&
    location1.state.toLowerCase() === location2.state.toLowerCase()
  );
}

/**
 * Normaliza localização (trim, uppercase state)
 * 
 * @param location - Localização para normalizar
 * @returns Localização normalizada ou null se inválida
 */
export function normalizeLocation(
  location: Location | null | undefined
): Location | null {
  if (!location?.city || !location?.state) return null;
  
  return {
    city: location.city.trim(),
    state: location.state.trim().toUpperCase()
  };
}
