/**
 * ID Generator
 * Gera IDs únicos para entidades do sistema
 */

/**
 * Gera um ID único no formato: prefixo_timestamp_random
 * 
 * @param prefix - Prefixo do ID (ex: 'drv', 'frt', 'usr')
 * @returns ID único no formato: prefix_timestamp_random
 * 
 * @example
 * generateId('drv') // 'drv_1707580800000_a1b2c3d4e'
 */
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Gera um UUID v4 usando crypto API (se disponível)
 * Fallback para método manual se crypto não estiver disponível
 */
export function generateUUID(): string {
  // Tentar usar crypto.randomUUID (Node 14.17+, browsers modernos)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: gerar UUID manualmente
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gera código de frete único no padrão de placa brasileira
 * Formato: AAA0A00
 * 
 * @returns Código no formato de placa brasileira
 * @example
 * generateFreightCode() // 'ABC1D23'
 */
export function generateFreightCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let code = '';
  
  // 3 letras
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // 1 número
  code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  // 1 letra
  code += letters.charAt(Math.floor(Math.random() * letters.length));
  
  // 2 números
  for (let i = 0; i < 2; i++) {
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return code;
}

/**
 * Valida se um ID segue o formato esperado
 * 
 * @param id - ID a ser validado
 * @param prefix - Prefixo esperado (opcional)
 * @returns true se o ID é válido
 */
export function isValidId(id: string, prefix?: string): boolean {
  if (!id || typeof id !== 'string') return false;
  
  // Formato: prefix_timestamp_random
  const parts = id.split('_');
  if (parts.length !== 3) return false;
  
  const [idPrefix, timestamp, random] = parts;
  
  // Verificar prefixo se fornecido
  if (prefix && idPrefix !== prefix) return false;
  
  // Verificar timestamp (deve ser número)
  if (isNaN(Number(timestamp))) return false;
  
  // Verificar random (deve ter pelo menos 5 caracteres)
  if (random.length < 5) return false;
  
  return true;
}

/**
 * Valida se uma string é um UUID válido
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Extrai o timestamp de um ID gerado por generateId()
 * 
 * @param id - ID no formato prefix_timestamp_random
 * @returns Timestamp em milissegundos ou null se inválido
 */
export function extractTimestamp(id: string): number | null {
  if (!isValidId(id)) return null;
  
  const parts = id.split('_');
  const timestamp = Number(parts[1]);
  
  return isNaN(timestamp) ? null : timestamp;
}

/**
 * Extrai o prefixo de um ID
 */
export function extractPrefix(id: string): string | null {
  if (!id || typeof id !== 'string') return null;
  
  const parts = id.split('_');
  return parts.length >= 1 ? parts[0] : null;
}
