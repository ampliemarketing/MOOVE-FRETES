// Types for collaborator management system

export type PermissionKey = 
  | 'create_freight'
  | 'edit_freight'
  | 'delete_freight'
  | 'view_quotes'
  | 'accept_quotes'
  | 'reject_quotes'
  | 'manage_drivers'
  | 'view_financial'
  | 'manage_financial'
  | 'send_messages'
  | 'view_analytics'
  | 'manage_collaborators'
  | 'view_settings'
  | 'manage_settings';

export interface Permission {
  key: PermissionKey;
  label: string;
  description: string;
  category: 'freight' | 'quotes' | 'drivers' | 'financial' | 'communication' | 'analytics' | 'admin';
}

export interface CollaboratorRole {
  id: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
  isCustom: boolean;
}

export interface Collaborator {
  id: string;
  companyId: string; // ID da transportadora
  userId: string; // ID do usuário no Supabase Auth
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  role: CollaboratorRole;
  isSuperAdmin: boolean; // Usuário criador da empresa
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  lastAccess?: string;
}

export interface CollaboratorInvite {
  id: string;
  companyId: string;
  email: string;
  roleId: string;
  invitedBy: string;
  invitedByName: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;
}

// Default permission definitions
export const ALL_PERMISSIONS: Permission[] = [
  // Freight permissions
  {
    key: 'create_freight',
    label: 'Criar Fretes',
    description: 'Permite criar novos fretes',
    category: 'freight'
  },
  {
    key: 'edit_freight',
    label: 'Editar Fretes',
    description: 'Permite editar fretes existentes',
    category: 'freight'
  },
  {
    key: 'delete_freight',
    label: 'Excluir Fretes',
    description: 'Permite excluir fretes',
    category: 'freight'
  },
  // Quote permissions
  {
    key: 'view_quotes',
    label: 'Visualizar Cotações',
    description: 'Permite visualizar cotações recebidas',
    category: 'quotes'
  },
  {
    key: 'accept_quotes',
    label: 'Aceitar Cotações',
    description: 'Permite aceitar cotações',
    category: 'quotes'
  },
  {
    key: 'reject_quotes',
    label: 'Rejeitar Cotações',
    description: 'Permite rejeitar cotações',
    category: 'quotes'
  },
  // Driver permissions
  {
    key: 'manage_drivers',
    label: 'Gerenciar Motoristas',
    description: 'Permite visualizar e gerenciar motoristas',
    category: 'drivers'
  },
  // Financial permissions
  {
    key: 'view_financial',
    label: 'Visualizar Financeiro',
    description: 'Permite visualizar informações financeiras',
    category: 'financial'
  },
  {
    key: 'manage_financial',
    label: 'Gerenciar Financeiro',
    description: 'Permite gerenciar transações financeiras',
    category: 'financial'
  },
  // Communication permissions
  {
    key: 'send_messages',
    label: 'Enviar Mensagens',
    description: 'Permite enviar mensagens no chat',
    category: 'communication'
  },
  // Analytics permissions
  {
    key: 'view_analytics',
    label: 'Visualizar Analytics',
    description: 'Permite acessar relatórios e analytics',
    category: 'analytics'
  },
  // Admin permissions
  {
    key: 'manage_collaborators',
    label: 'Gerenciar Colaboradores',
    description: 'Permite adicionar, editar e remover colaboradores',
    category: 'admin'
  },
  {
    key: 'view_settings',
    label: 'Visualizar Configurações',
    description: 'Permite visualizar configurações da empresa',
    category: 'admin'
  },
  {
    key: 'manage_settings',
    label: 'Gerenciar Configurações',
    description: 'Permite alterar configurações da empresa',
    category: 'admin'
  }
];

// Default roles
export const DEFAULT_ROLES: CollaboratorRole[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Acesso total ao sistema',
    permissions: ALL_PERMISSIONS.map(p => p.key),
    isCustom: false
  },
  {
    id: 'manager',
    name: 'Gerente',
    description: 'Gerencia fretes e cotações, sem acesso financeiro completo',
    permissions: [
      'create_freight',
      'edit_freight',
      'delete_freight',
      'view_quotes',
      'accept_quotes',
      'reject_quotes',
      'manage_drivers',
      'view_financial',
      'send_messages',
      'view_analytics',
      'view_settings'
    ],
    isCustom: false
  },
  {
    id: 'operator',
    name: 'Operador',
    description: 'Gerencia fretes e cotações básicas',
    permissions: [
      'create_freight',
      'edit_freight',
      'view_quotes',
      'accept_quotes',
      'reject_quotes',
      'send_messages',
      'view_settings'
    ],
    isCustom: false
  },
  {
    id: 'assistant',
    name: 'Assistente',
    description: 'Apenas visualização e comunicação',
    permissions: [
      'view_quotes',
      'send_messages',
      'view_settings'
    ],
    isCustom: false
  },
  {
    id: 'financial',
    name: 'Financeiro',
    description: 'Acesso ao módulo financeiro',
    permissions: [
      'view_financial',
      'manage_financial',
      'view_analytics',
      'view_settings'
    ],
    isCustom: false
  }
];

// Helper to check if user has a specific permission
export function hasPermission(collaborator: Collaborator | null, permission: PermissionKey): boolean {
  if (!collaborator) return false;
  if (collaborator.isSuperAdmin) return true;
  return collaborator.role.permissions.includes(permission);
}

// Helper to get permission by key
export function getPermission(key: PermissionKey): Permission | undefined {
  return ALL_PERMISSIONS.find(p => p.key === key);
}

// Helper to get role by id
export function getRoleById(roleId: string, customRoles: CollaboratorRole[] = []): CollaboratorRole | undefined {
  return [...DEFAULT_ROLES, ...customRoles].find(r => r.id === roleId);
}

// Helper to group permissions by category
export function getPermissionsByCategory(): Record<string, Permission[]> {
  return ALL_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);
}

// Category labels
export const CATEGORY_LABELS: Record<string, string> = {
  freight: 'Gestão de Fretes',
  quotes: 'Cotações',
  drivers: 'Motoristas',
  financial: 'Financeiro',
  communication: 'Comunicação',
  analytics: 'Relatórios',
  admin: 'Administração'
};
