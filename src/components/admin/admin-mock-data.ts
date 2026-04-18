// Admin type definitions (data is now fetched from Supabase)

// E-mails dos admins lidos da env var VITE_ADMIN_EMAILS (separados por vírgula)
const _adminEmailsEnv = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
export const SUPER_ADMIN_EMAILS: string[] = _adminEmailsEnv
  ? _adminEmailsEnv.split(',').map((e) => e.trim()).filter(Boolean)
  : [];

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  userType: 'caminhoneiro' | 'transportadora' | 'embarcador' | 'agenciador';
  status: 'active' | 'pending' | 'blocked' | 'suspended';
  verified: boolean;
  rating: number;
  totalFreights: number;
  phone: string;
  cpfCnpj: string;
  city: string;
  state: string;
  createdAt: string;
  lastLogin: string;
}

export interface AdminCompany {
  id: string;
  name: string;
  cnpj: string;
  type: 'transportadora' | 'embarcador' | 'agenciador';
  status: 'active' | 'pending' | 'blocked';
  owner: string;
  collaborators: number;
  activeFreights: number;
  rntrc: string;
  state: string;
  createdAt: string;
}

export interface AdminFreight {
  id: string;
  code: string;
  status: 'draft' | 'active' | 'scheduled' | 'in_transit' | 'completed' | 'cancelled';
  origin: string;
  destination: string;
  value: number;
  shipper: string;
  carrier: string;
  cargoType: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTransaction {
  id: string;
  freightCode: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  method: 'pix' | 'transfer' | 'boleto';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  payer: string;
  receiver: string;
  createdAt: string;
}

export interface AdminLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  category: string;
  details: string;
  ip: string;
  createdAt: string;
}

export interface AdminReview {
  id: string;
  fromUser: string;
  toUser: string;
  rating: number;
  comment: string;
  freightCode: string;
  reported: boolean;
  reportReason?: string;
  status: 'visible' | 'hidden' | 'pending_review';
  createdAt: string;
}

export interface AdminMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  freightCode?: string;
  hasAttachment: boolean;
  reported: boolean;
  createdAt: string;
}
