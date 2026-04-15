/**
 * MaisFrete Database Schema
 * Hybrid approach using Supabase KV Store with structured keys
 */

import type { CollaboratorRole } from '../collaborator-types';

// ============================================
// USER ENTITIES
// ============================================

export interface User {
  id: string;
  email: string;
  userType: 'embarcador' | 'transportadora' | 'caminhoneiro' | 'agenciador';
  name: string;
  phone?: string;
  cpf?: string;
  cnpj?: string;
  createdAt: string;
  updatedAt: string;
  
  // ✅ NOVO: Endereço (de drivers.address ou companies.address)
  address?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  
  // Profile data
  profile: {
    avatar?: string;
    bio?: string;
    rating?: number;
    totalFreights?: number;
    completedFreights?: number;
    verificationStatus?: 'pending' | 'verified' | 'rejected';
  };
  
  // Gamification
  gamification: {
    level: number;
    xp: number;
    badges: string[];
    achievements: string[];
  };
  
  // Preferences
  preferences: {
    notifications: boolean;
    emailAlerts: boolean;
    autoAcceptQuotes?: boolean;
  };
}

export interface Driver {
  id: string;
  userId: string;
  user_id?: string; // ✅ CORRIGIDO: Adicionar user_id (snake_case do banco) para compatibilidade
  name: string;
  phone: string;
  cpf: string;
  cnh: string;
  cnhCategory: string;
  cnhValidity: string;
  rntrc?: string;
  avatarUrl?: string; // Avatar do motorista (de profiles.avatar_url ou users.avatar_url)
  
  // Vehicle information
  vehicle: {
    type: string;
    plate: string;
    model: string;
    year: string;
    capacity: string;
  };
  
  // Vehicle and trailer types (multiple selection)
  vehicleTypes?: string[];
  trailerTypes?: string[];
  
  // Location
  currentLocation?: {
    lat: number;
    lng: number;
    city: string;
    state: string;
    lastUpdated: string;
  };
  
  // Status
  status: 'available' | 'busy' | 'offline';
  rating: number;
  totalTrips: number;
  completedTrips: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  userId: string;
  name: string;  // Display name for compatibility
  companyName: string;
  type: 'embarcador' | 'transportadora' | 'agenciador';  // For UI compatibility
  cnpj: string;
  phone?: string;  // Direct phone field for compatibility
  email?: string;  // Direct email field for compatibility
  logo?: string;  // Company logo
  rating?: number;  // Company rating
  description?: string;  // Company description
  website?: string;  // Company website
  stateRegistration?: string;
  municipalRegistration?: string;
  
  // Address
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  
  // Contact
  contact: {
    email: string;
    phone: string;
    website?: string;
  };
  
  // Business info
  businessType: 'embarcador' | 'transportadora' | 'agenciador';
  employeeCount?: string;
  fleetSize?: number;
  operationalAreas?: string[];
  
  // Verification
  verificationStatus: 'pending' | 'verified' | 'rejected';
  documents: {
    cnpjDocument?: string;
    contractSocial?: string;
    proofOfAddress?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

// ============================================
// FREIGHT ENTITIES
// ============================================

export interface Freight {
  id: string;
  freight_code?: string; // Código único no padrão placa brasileira (AAA0A00)
  customerId: string;
  customerName: string;
  publisherPhone?: string; // ✅ Telefone do publicador (para WhatsApp)
  type: 'plus' | 'regular';
  exposureLevel: 'Alta exposição' | 'Média exposição' | 'Baixa exposição';
  
  // Route
  origin: {
    city: string;
    state: string;
    cep?: string;
    address?: string;
  };
  destination: {
    city: string;
    state: string;
    cep?: string;
    address?: string;
  };
  
  // Cargo details
  cargo: string;
  cargoType: string;
  occupancyType?: 'completa' | 'complemento';
  weight: string;
  volume?: string;
  quantity?: string;
  
  // Vehicle requirements
  truckType: string;
  category: string;
  bodyType?: string;
  
  // Pricing
  price: string | 'A combinar';
  paymentTerms?: string;
  
  // Schedule
  pickupDate?: string;
  deliveryDate?: string;
  flexibility?: string;
  
  // Status
  status: 'draft' | 'active' | 'scheduled' | 'inactive' | 'completed' | 'in-transit' | 'contracted' | 'cancelled';
  
  // Accepted driver info
  acceptedDriverId?: string;
  acceptedDriverName?: string;
  
  // Additional info
  observations?: string;
  
  // Metrics
  views: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  completedAt?: string;
}

// ============================================
// CHAT ENTITIES
// ============================================

export interface Chat {
  id: string;
  participants: string[]; // User IDs
  type: 'direct' | 'group' | 'support';
  
  // Related entities
  freightId?: string;
  
  // Last message
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: string;
  };
  
  // Metadata
  unreadCount?: Record<string, number>; // userId -> count (optional for backward compatibility)
  isArchived: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  
  // Content
  content: string;
  type: 'text' | 'image' | 'file' | 'location' | 'quote' | 'freight';
  
  // Attachments
  attachments?: {
    type: string;
    url: string;
    name: string;
    size?: number;
  }[];
  
  // Metadata
  isRead: boolean;
  readBy?: string[]; // ⚠️ Opcional: usado apenas no LocalStorage, NÃO existe no Supabase
  
  // Timestamps
  createdAt: string;
  editedAt?: string;
}

// ============================================
// NOTIFICATION ENTITIES
// ============================================

export interface Notification {
  id: string;
  userId: string;
  
  // Content
  type: 'freight' | 'quote' | 'message' | 'payment' | 'system' | 'social' | 'achievement';
  title: string;
  message: string;
  icon?: string;
  
  // Related data
  relatedId?: string;
  relatedType?: 'freight' | 'quote' | 'chat' | 'transaction' | 'post';
  
  // Action
  actionUrl?: string;
  actionLabel?: string;
  
  // Status
  read: boolean;
  
  // Timestamps
  createdAt: string;
  readAt?: string;
}

// ============================================
// SOCIAL ENTITIES
// ============================================

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorType: 'embarcador' | 'transportadora' | 'caminhoneiro' | 'agenciador';
  
  // Content
  content: string;
  images?: string[];
  
  // Engagement
  likes: number;
  likedBy: string[];
  comments: number;
  shares: number;
  
  // Metadata
  tags?: string[];
  location?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  
  content: string;
  likes: number;
  likedBy: string[];
  
  createdAt: string;
  updatedAt: string;
}

// ============================================
// TRANSACTION ENTITIES
// ============================================

export interface Transaction {
  id: string;
  freightId: string;
  quoteId: string;
  
  // Parties
  payerId: string;
  payerName: string;
  receiverId: string;
  receiverName: string;
  
  // Amount
  amount: string;
  currency: 'BRL';
  
  // Payment details
  paymentMethod: 'pix' | 'boleto' | 'credit_card' | 'bank_transfer';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  
  // Gateway info
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, unknown>;
  
  // Timestamps
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
}

// ============================================
// TRACKING ENTITIES
// ============================================

export interface TrackingEvent {
  id: string;
  freightId: string;
  driverId?: string;
  
  // Event details
  eventType: 'pickup' | 'in_transit' | 'checkpoint' | 'delivery' | 'delay' | 'incident';
  status: string;
  description: string;
  
  // Location
  location?: {
    lat: number;
    lng: number;
    city: string;
    state: string;
    address?: string;
  };
  
  // Metadata
  images?: string[];
  notes?: string;
  
  timestamp: string;
}

// ============================================
// GAMIFICATION ENTITIES
// ============================================

export interface Achievement {
  id: string;
  userId: string;
  
  type: string;
  name: string;
  description: string;
  icon: string;
  
  // Progress
  progress: number;
  target: number;
  completed: boolean;
  
  // Rewards
  xpReward: number;
  badgeReward?: string;
  
  unlockedAt?: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
}

// ============================================
// RATING ENTITIES
// ============================================

export interface Rating {
  id: string;
  freightId: string | null; // ✅ Avaliações podem ser independentes (sem frete associado)
  freightCode?: string | null; // Código do frete para referência (opcional)
  
  // Quem está sendo avaliado
  targetId: string; // ID do usuário sendo avaliado (motorista ou empresa)
  targetName: string;
  targetType: 'embarcador' | 'transportadora' | 'caminhoneiro' | 'agenciador';
  
  // Quem está avaliando
  evaluatorId: string; // ID de quem está avaliando
  evaluatorName: string;
  evaluatorType: 'embarcador' | 'transportadora' | 'caminhoneiro' | 'agenciador';
  
  // Ratings (1-5 estrelas)
  overallRating: number; // Avaliação geral
  punctualityRating: number; // Pontualidade
  communicationRating: number; // Comunicação
  professionalismRating: number; // Profissionalismo
  
  // Review
  comment?: string; // Comentário opcional
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// PREFERRED ROUTES
// ============================================

export interface PreferredRoute {
  id: string;
  driverId: string; // ID do motorista
  
  // Origem
  origin: {
    city: string;
    state: string;
  };
  
  // Destino
  destination: {
    city: string;
    state: string;
  };
  
  // Preferências
  priority: 'high' | 'medium' | 'low'; // Prioridade da rota
  notes?: string; // Observações sobre a rota
  
  // Status
  isActive: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// COLLABORATOR ENTITIES
// ============================================

export interface Collaborator {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  role: CollaboratorRole;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastAccess?: string;
  createdAt: string;
  createdBy: string;
}

// ============================================
// KEY PATTERNS
// ============================================

export const KeyPatterns = {
  // Users
  user: (id: string) => `user:${id}`,
  userByEmail: (email: string) => `user:email:${email}`,
  usersList: () => 'users:list',
  
  // Drivers
  driver: (id: string) => `driver:${id}`,
  driverByUserId: (userId: string) => `driver:user:${userId}`,
  driversList: () => 'drivers:list',
  
  // Companies
  company: (id: string) => `company:${id}`,
  companyByUserId: (userId: string) => `company:user:${userId}`,
  companiesList: () => 'companies:list',
  
  // Freights
  freight: (id: string) => `freight:${id}`,
  freightsByCustomer: (customerId: string) => `freights:customer:${customerId}`,
  freightsActive: () => 'freights:active',
  freightsList: () => 'freights:list',
  
  // Chats
  chat: (id: string) => `chat:${id}`,
  chatsByUser: (userId: string) => `chats:user:${userId}`,
  chatsList: () => 'chats:list',
  
  // Messages
  message: (id: string) => `message:${id}`,
  messagesByChat: (chatId: string) => `messages:chat:${chatId}`,
  
  // Notifications
  notification: (id: string) => `notification:${id}`,
  notificationsByUser: (userId: string) => `notifications:user:${userId}`,
  
  // Social
  post: (id: string) => `post:${id}`,
  postsList: () => 'posts:list',
  comment: (id: string) => `comment:${id}`,
  commentsByPost: (postId: string) => `comments:post:${postId}`,
  
  // Transactions
  transaction: (id: string) => `transaction:${id}`,
  transactionsByUser: (userId: string) => `transactions:user:${userId}`,
  transactionsByFreight: (freightId: string) => `transactions:freight:${freightId}`,
  
  // Tracking
  trackingEvent: (id: string) => `tracking:${id}`,
  trackingByFreight: (freightId: string) => `tracking:freight:${freightId}`,
  
  // Achievements
  achievement: (id: string) => `achievement:${id}`,
  achievementsByUser: (userId: string) => `achievements:user:${userId}`,
  
  // Ratings
  rating: (id: string) => `rating:${id}`,
  ratingsByTarget: (targetId: string) => `ratings:target:${targetId}`, // Avaliações recebidas
  ratingsByEvaluator: (evaluatorId: string) => `ratings:evaluator:${evaluatorId}`, // Avaliações feitas
  ratingsByFreight: (freightId: string) => `ratings:freight:${freightId}`,
  ratingsList: () => 'ratings:list',
  
  // Preferred Routes
  preferredRoute: (id: string) => `preferredRoute:${id}`,
  preferredRoutesByDriver: (driverId: string) => `preferredRoutes:driver:${driverId}`,
  preferredRoutesList: () => 'preferredRoutes:list',
  
  // Counters
  counter: (type: string) => `counter:${type}`,
};

// ============================================
// HELPER TYPES
// ============================================

export type EntityType = 
  | 'user'
  | 'driver'
  | 'company'
  | 'freight'
  | 'chat'
  | 'message'
  | 'notification'
  | 'post'
  | 'comment'
  | 'transaction'
  | 'achievement';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: string | number | boolean | string[] | null | undefined;
}

// ============================================
// DATABASE RESPONSE TYPES
// ============================================

export interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  isDuplicate?: boolean; // Flag para indicar que o item já existe (usado em cotações)
}

export type DBResponse<T> = DatabaseResponse<T>;