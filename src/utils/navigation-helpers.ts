/**
 * Navigation helpers for cross-screen navigation with data
 */

export interface ChatNavigationState {
  userId?: string | null;
  userName?: string | null;
  freightId?: string | null;
  initialMessage?: string | null;
}

export interface FreightNavigationState {
  selectedFreightId?: string | null;
  openForm?: boolean;
  initialView?: 'my-freights' | 'all-freights';
  initialTab?: 'create' | 'list';
}

export interface DriverNavigationState {
  selectedDriverId?: string | null;
}

export interface CompanyNavigationState {
  selectedCompanyId?: string | null;
}

/**
 * Build auto-message for freight chat navigation
 */
export function buildFreightChatMessage(freightData: any): string {
  const origin = typeof freightData.origin === 'string'
    ? freightData.origin
    : `${freightData.origin?.city}, ${freightData.origin?.state}`;

  const destination = typeof freightData.destination === 'string'
    ? freightData.destination
    : `${freightData.destination?.city}, ${freightData.destination?.state}`;

  const cargo = typeof freightData.cargo === 'string'
    ? freightData.cargo
    : freightData.cargo?.description || freightData.cargo?.type || 'Não especificado';

  const freightCode = freightData.freight_code || `#${(freightData.id || '').substring(0, 7).toUpperCase()}`;

  return `*Olá, tenho interesse no frete ${freightCode}.*\n\n` +
    `📦 ${origin} → ${destination}\n` +
    `Carga: ${cargo}\n\n` +
    `💰 Valor: ${freightData.price || 'Não especificado'}\n\n` +
    `*A carga ainda está disponível?* 🚚`;
}

/**
 * Map route paths to menu item IDs for navigation highlighting
 */
export function getActiveMenuId(pathname: string): string {
  // Exact matches first
  const exactMap: Record<string, string> = {
    '/': 'dashboard',
    '/fretes': 'all-freights',
    '/fretes/meus': 'my-freights',
    '/fretes/novo': 'freight-registration',
    '/fretes/historico': 'history',
    '/motoristas': 'drivers',
    '/motoristas/rotas': 'published-routes',
    '/chat': 'chat',
    '/social': 'social',
    '/perfil': 'profile',
    '/configuracoes': 'settings',
    '/financeiro': 'transaction',
    '/colaboradores': 'collaborators',
    '/logs': 'activity-logs',
    '/empresas': 'companies',
    '/rotas': 'preferred-routes',
  };

  if (exactMap[pathname]) return exactMap[pathname];

  // Prefix matches
  if (pathname.startsWith('/chat/')) return 'chat';
  if (pathname.startsWith('/fretes/')) return 'freight-management';
  if (pathname.startsWith('/motoristas/')) return 'drivers';

  return 'dashboard';
}

/**
 * Map route paths to bottom nav item IDs
 */
export function getActiveBottomNavId(pathname: string): string {
  if (pathname === '/') return 'dashboard';
  if (pathname.startsWith('/fretes')) return 'freight-management';
  if (pathname === '/rotas') return 'preferred-routes';
  if (pathname.startsWith('/motoristas') || pathname.startsWith('/empresas')) return 'drivers';
  if (pathname.startsWith('/chat')) return 'chat';
  if (pathname.startsWith('/perfil') || pathname.startsWith('/configuracoes') || pathname.startsWith('/financeiro') || pathname.startsWith('/colaboradores') || pathname.startsWith('/logs')) return 'profile';
  if (pathname.startsWith('/social')) return 'dashboard';
  return 'dashboard';
}

/**
 * Check if a freight submenu item is active
 */
export function isFreightSubItemActive(pathname: string): boolean {
  return pathname.startsWith('/fretes');
}

/**
 * Check if a drivers submenu item is active
 */
export function isDriversSubItemActive(pathname: string): boolean {
  return pathname === '/motoristas' || pathname.startsWith('/motoristas/');
}