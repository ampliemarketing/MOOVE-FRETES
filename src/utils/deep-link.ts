/**
 * Deep Link Parser - Handles URL-based navigation
 * 
 * Supports URLs like:
 * - /motorista/{id} → Driver profile
 * - /empresa/{id} → Company profile  
 * - /frete/{id} → Freight detail
 * - /rota/{id} → Route detail
 * - /perfil/{id} → User profile (generic)
 * - /chat/{id} → Chat conversation
 * - /post/{id} → Social feed post
 */

export type DeepLinkType = 'driver' | 'company' | 'freight' | 'route' | 'profile' | 'chat' | 'post';

export interface DeepLink {
  type: DeepLinkType;
  id: string;
}

const DEEP_LINK_PATTERNS: Array<{ pattern: RegExp; type: DeepLinkType }> = [
  { pattern: /^\/motorista\/([a-zA-Z0-9\-]+)\/?$/, type: 'driver' },
  { pattern: /^\/empresa\/([a-zA-Z0-9\-]+)\/?$/, type: 'company' },
  { pattern: /^\/frete\/([a-zA-Z0-9\-#]+)\/?$/, type: 'freight' },
  { pattern: /^\/rota\/([a-zA-Z0-9\-]+)\/?$/, type: 'route' },
  { pattern: /^\/perfil\/([a-zA-Z0-9\-]+)\/?$/, type: 'profile' },
  { pattern: /^\/chat\/([a-zA-Z0-9\-]+)\/?$/, type: 'chat' },
  { pattern: /^\/post\/([a-zA-Z0-9\-]+)\/?$/, type: 'post' },
];

// Internal domain pattern
const INTERNAL_DOMAIN = /^https?:\/\/(www\.)?(fretes\.moovefretes\.com\.br|localhost(:\d+)?)/;

// App base URL for generating deep link URLs
const APP_BASE_URL = 'https://fretes.moovefretes.com.br';

/**
 * Parse a URL path into a DeepLink object
 */
export function parseDeepLink(pathname: string): DeepLink | null {
  for (const { pattern, type } of DEEP_LINK_PATTERNS) {
    const match = pathname.match(pattern);
    if (match && match[1]) {
      return { type, id: match[1] };
    }
  }
  return null;
}

/**
 * Parse a full URL into a DeepLink (for internal links)
 */
export function parseDeepLinkFromUrl(url: string): DeepLink | null {
  if (!INTERNAL_DOMAIN.test(url)) return null;
  
  try {
    const urlObj = new URL(url);
    return parseDeepLink(urlObj.pathname);
  } catch {
    return null;
  }
}

/**
 * Check if a URL is an internal app URL
 */
export function isInternalUrl(url: string): boolean {
  return INTERNAL_DOMAIN.test(url);
}

/**
 * Generate a deep link URL for sharing
 */
export function generateDeepLinkUrl(type: DeepLinkType, id: string): string {
  const pathMap: Record<DeepLinkType, string> = {
    driver: 'motorista',
    company: 'empresa',
    freight: 'fretes',
    route: 'rota',
    profile: 'perfil',
    chat: 'chat',
    post: 'post',
  };
  
  return `${APP_BASE_URL}/${pathMap[type]}/${id}`;
}

/**
 * Convert a user type string to a DeepLinkType
 * All user types now use the unified /perfil/:id route
 */
export function userTypeToDeepLinkType(userType: string): DeepLinkType {
  return 'profile';
}

/**
 * Generate a deep link URL for a user based on their userType
 */
export function generateUserDeepLinkUrl(userType: string, id: string): string {
  return generateDeepLinkUrl(userTypeToDeepLinkType(userType), id);
}

/**
 * Generate a human-readable label for a deep link
 */
export function getDeepLinkLabel(type: DeepLinkType): string {
  const labels: Record<DeepLinkType, string> = {
    driver: 'Motorista',
    company: 'Empresa',
    freight: 'Frete',
    route: 'Rota',
    profile: 'Perfil',
    chat: 'Conversa',
    post: 'Publicação',
  };
  return labels[type];
}

/**
 * Get the tab and entity info for a deep link
 */
export function getTabForDeepLink(deepLink: DeepLink): { tab: string; entityId: string; entityType: DeepLinkType } {
  switch (deepLink.type) {
    case 'driver':
      return { tab: 'all-drivers', entityId: deepLink.id, entityType: 'driver' };
    case 'company':
      return { tab: 'companies', entityId: deepLink.id, entityType: 'company' };
    case 'freight':
      return { tab: 'all-freights', entityId: deepLink.id, entityType: 'freight' };
    case 'route':
      return { tab: 'published-routes', entityId: deepLink.id, entityType: 'route' };
    case 'profile':
      return { tab: 'profile', entityId: deepLink.id, entityType: 'profile' };
    case 'chat':
      return { tab: 'chat', entityId: deepLink.id, entityType: 'chat' };
    case 'post':
      return { tab: 'social', entityId: deepLink.id, entityType: 'post' };
  }
}

/**
 * Get the current deep link from the browser URL
 */
export function getCurrentDeepLink(): DeepLink | null {
  if (typeof window === 'undefined') return null;
  return parseDeepLink(window.location.pathname);
}

/**
 * Clear the deep link from the URL (replace with /)
 */
export function clearDeepLinkFromUrl(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== '/') {
    window.history.replaceState(null, '', '/');
  }
}