/**
 * ADAPTERS - Camada de Conversão entre Schema TypeScript Local e Supabase SQL
 * 
 * Resolve inconsistências de nomenclatura e estrutura entre:
 * - Schema local (schema.ts) - usado no código
 * - Schema SQL (Supabase) - usado no banco
 * 
 * ✅ Padrão: sempre converter antes de salvar no Supabase
 */

import type { Database } from './database.types';
import type { Freight, Driver, Transaction, Notification, SocialPost } from './schema';

// ============================================
// FREIGHT ADAPTERS
// ============================================

type FreightRow = Database['public']['Tables']['freights']['Row'];
type FreightInsert = Database['public']['Tables']['freights']['Insert'];

/**
 * Converte Freight (TypeScript local) para formato SQL do Supabase
 */
export function freightToSQL(freight: Freight): FreightInsert {
  return {
    id: freight.id,
    publisher_id: freight.customerId, // ✅ customerId → publisher_id
    publisher_phone: freight.publisherPhone || null, // ✅ Telefone para WhatsApp direto
    title: freight.cargo || `${freight.origin.city}/${freight.origin.state} → ${freight.destination.city}/${freight.destination.state}`,
    description: freight.observations || '',
    cargo_type: freight.cargoType || freight.cargo || 'Carga geral',
    weight_kg: parseBrazilianNumber(freight.weight), // ✅ string BR → numeric (suporta "25 ton", "25.000 kg")
    volume_m3: freight.volume ? parseFloat(freight.volume) : null,
    quantity: freight.quantity ? parseInt(freight.quantity) : null,
    value_estimate: freight.price === 'A combinar' ? null : parseBrazilianNumber(freight.price), // ✅ string BR → numeric (suporta "R$ 1.500,00")
    origin_address: freight.origin.address || '',
    origin_city: freight.origin.city,
    origin_state: freight.origin.state,
    origin_cep: freight.origin.cep || null,
    destination_address: freight.destination.address || '',
    destination_city: freight.destination.city,
    destination_state: freight.destination.state,
    destination_cep: freight.destination.cep || null,
    pickup_date: freight.pickupDate || null,
    delivery_date: freight.deliveryDate || null,
    status: freight.status, // ✅ Agora está alinhado, sem mapeamento manual
    visibility: 'public',
    vehicle_types: [freight.truckType || 'Truck'],
    views_count: freight.views || 0,
    freight_code: freight.freight_code || null,
    accepted_driver_id: freight.acceptedDriverId || null,
    accepted_driver_name: freight.acceptedDriverName || null,
    completed_at: freight.completedAt || null,
    created_at: freight.createdAt,
    updated_at: freight.updatedAt,
    metadata: {
      customerName: freight.customerName,
      type: freight.type,
      exposureLevel: freight.exposureLevel,
      category: freight.category,
      bodyType: freight.bodyType,
      paymentTerms: freight.paymentTerms,
      flexibility: freight.flexibility,
    },
  };
}

/**
 * Converte FreightRow (SQL) para Freight (TypeScript local)
 */
export function sqlToFreight(row: FreightRow): Freight {
  const metadata = row.metadata as any || {};
  
  return {
    id: row.id,
    customerId: row.publisher_id, // ✅ publisher_id → customerId
    customerName: metadata.customerName || '',
    publisherPhone: metadata.publisherPhone,
    type: metadata.type || 'regular',
    exposureLevel: metadata.exposureLevel || 'Média exposição',
    freight_code: row.freight_code || undefined,
    
    origin: {
      city: row.origin_city,
      state: row.origin_state,
      cep: row.origin_cep || undefined,
      address: row.origin_address || undefined,
    },
    destination: {
      city: row.destination_city,
      state: row.destination_state,
      cep: row.destination_cep || undefined,
      address: row.destination_address || undefined,
    },
    
    cargo: row.title || '',
    cargoType: row.cargo_type,
    weight: row.weight_kg?.toString() || '0', // ✅ numeric → string
    volume: row.volume_m3?.toString(),
    quantity: row.quantity?.toString(),
    
    truckType: row.vehicle_types?.[0] || 'Truck',
    category: metadata.category || '',
    bodyType: metadata.bodyType,
    
    price: row.value_estimate ? row.value_estimate.toString() : 'A combinar', // ✅ numeric → string
    paymentTerms: metadata.paymentTerms,
    
    pickupDate: row.pickup_date || undefined,
    deliveryDate: row.delivery_date || undefined,
    flexibility: metadata.flexibility,
    
    status: row.status as Freight['status'],
    acceptedDriverId: row.accepted_driver_id || undefined,
    acceptedDriverName: row.accepted_driver_name || undefined,
    
    observations: row.description || undefined,
    views: row.views_count,
    
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.created_at,
    completedAt: row.completed_at || undefined,
  };
}

// ============================================
// DRIVER ADAPTERS
// ============================================

type DriverRow = Database['public']['Tables']['drivers']['Row'];
type DriverInsert = Database['public']['Tables']['drivers']['Insert'];

/**
 * Converte Driver (TypeScript local) para formato SQL do Supabase
 */
export function driverToSQL(driver: Driver): DriverInsert {
  const sqlData = {
    id: driver.id,
    user_id: driver.userId,
    name: driver.name,
    cpf: driver.cpf,
    phone: driver.phone,
    cnh: driver.cnh,
    cnh_category: driver.cnhCategory || 'B', // ✅ NOT NULL no banco - default 'B'
    cnh_expiry: driver.cnhValidity || null,
    rntrc: driver.rntrc || null,
    profile_image: driver.avatarUrl || null,
    
    // ✅ Converter objeto vehicle para campos separados
    vehicle_type: driver.vehicle?.type || null,
    vehicle_plate: driver.vehicle?.plate || null,
    vehicle_model: driver.vehicle?.model || null,
    vehicle_year: driver.vehicle?.year || null,
    vehicle_capacity: driver.vehicle?.capacity ? parseFloat(driver.vehicle.capacity) : null,
    
    // ✅ Arrays de tipos de veículo
    vehicle_types: driver.vehicleTypes || null,
    body_types: driver.trailerTypes || null, // trailerTypes → body_types
    
    // ✅ Localização como JSON
    current_location: driver.currentLocation ? {
      lat: driver.currentLocation.lat,
      lng: driver.currentLocation.lng,
      city: driver.currentLocation.city,
      state: driver.currentLocation.state,
      lastUpdated: driver.currentLocation.lastUpdated,
    } : null,
    
    // ✅ Status: 'available' | 'busy' | 'offline' → boolean available
    available: driver.status === 'available',
    
    // ✅ CORRIGIDO: Adicionar availability_expires_at
    availability_expires_at: (driver as any).availabilityExpiresAt || null,
    
    rating: driver.rating || 0,
    completed_trips: driver.completedTrips || 0,
    
    created_at: driver.createdAt,
    updated_at: driver.updatedAt,
  };
  
  // 🔍 DEBUG: Logging para ver se availability_expires_at está sendo incluído
  console.log('🔄 [driverToSQL] Convertendo Driver para SQL:', {
    hasAvailabilityExpiresAt: !!(driver as any).availabilityExpiresAt,
    availabilityExpiresAt: (driver as any).availabilityExpiresAt,
    sqlAvailabilityExpiresAt: sqlData.availability_expires_at
  });
  
  return sqlData;
}

/**
 * Converte DriverRow (SQL) para Driver (TypeScript local)
 */
export function sqlToDriver(row: DriverRow): Driver {
  const location = row.current_location as any;
  
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name || '',
    phone: row.phone || '',
    cpf: row.cpf || '',
    cnh: row.cnh,
    cnhCategory: row.cnh_category,
    cnhValidity: row.cnh_expiry || '',
    rntrc: row.rntrc || undefined,
    avatarUrl: row.profile_image || undefined,
    
    // ✅ Reconstruir objeto vehicle de campos separados
    vehicle: {
      type: row.vehicle_type || '',
      plate: row.vehicle_plate || '',
      model: row.vehicle_model || '',
      year: row.vehicle_year || '',
      capacity: row.vehicle_capacity?.toString() || '',
    },
    
    vehicleTypes: row.vehicle_types || undefined,
    trailerTypes: row.body_types || undefined,
    
    currentLocation: location ? {
      lat: location.lat,
      lng: location.lng,
      city: location.city,
      state: location.state,
      lastUpdated: location.lastUpdated,
    } : undefined,
    
    // ✅ boolean available → enum status
    status: row.available ? 'available' : 'offline',
    
    // ✅ CORRIGIDO: Adicionar availabilityExpiresAt do banco
    availabilityExpiresAt: row.availability_expires_at || undefined,
    
    rating: row.rating || 0,
    totalTrips: row.completed_trips || 0,
    completedTrips: row.completed_trips || 0,
    
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Driver; // Type assertion pois availabilityExpiresAt não está na interface
}

// ============================================
// TRANSACTION ADAPTERS
// ============================================

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

/**
 * Converte Transaction (TypeScript local) para formato SQL do Supabase
 */
export function transactionToSQL(transaction: Transaction): TransactionInsert {
  const amount = parseFloat(transaction.amount);
  
  return {
    id: transaction.id,
    freight_id: transaction.freightId || null,
    payer_id: transaction.payerId,
    receiver_id: transaction.receiverId,
    amount: amount, // ✅ string → numeric
    fee: 0,
    net_amount: amount,
    payment_method: transaction.paymentMethod,
    payment_status: transaction.status, // ✅ status → payment_status
    transaction_type: 'freight_payment',
    external_id: transaction.gatewayTransactionId || null,
    created_at: transaction.createdAt,
    processed_at: transaction.processedAt || null,
  };
}

/**
 * Converte TransactionRow (SQL) para Transaction (TypeScript local)
 */
export function sqlToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    freightId: row.freight_id || '',
    quoteId: '', // Não usado mais (sistema sem cotações)
    
    payerId: row.payer_id,
    payerName: '', // Será preenchido via join
    receiverId: row.receiver_id,
    receiverName: '', // Será preenchido via join
    
    amount: row.amount.toString(), // ✅ numeric → string
    currency: 'BRL',
    
    paymentMethod: row.payment_method as Transaction['paymentMethod'],
    status: row.payment_status as Transaction['status'],
    
    gatewayTransactionId: row.external_id || undefined,
    
    createdAt: row.created_at,
    processedAt: row.processed_at || undefined,
    completedAt: row.payment_status === 'completed' ? row.processed_at || undefined : undefined,
  };
}

// ============================================
// NOTIFICATION ADAPTERS
// ============================================

type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

/**
 * Converte Notification (TypeScript local) para formato SQL do Supabase
 */
export function notificationToSQL(notification: Notification): NotificationInsert {
  return {
    id: notification.id,
    user_id: notification.userId,
    title: notification.title,
    message: notification.message,
    type: notification.type as NotificationInsert['type'],
    icon: notification.icon || null,
    action_url: notification.actionUrl || null,
    is_read: notification.read || false, // ✅ CORRIGIDO: usar 'read' em vez de 'isRead'
    read_at: notification.readAt || null,
    created_at: notification.createdAt,
    metadata: notification.metadata || {},
  };
}

/**
 * Converte NotificationRow (SQL) para Notification (TypeScript local)
 */
export function sqlToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type as Notification['type'],
    icon: row.icon || undefined,
    actionUrl: row.action_url || undefined,
    read: row.is_read, // ✅ CORRIGIDO: usar 'read' em vez de 'isRead'
    readAt: row.read_at || undefined,
    createdAt: row.created_at,
    metadata: (row.metadata as any) || undefined,
  };
}

// ============================================
// CONVERSATION ADAPTERS
// ============================================

type ConversationRow = Database['public']['Tables']['conversations']['Row'];
type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];

/**
 * Converte Conversation (TypeScript local) para formato SQL do Supabase
 */
export function conversationToSQL(conversation: any): ConversationInsert {
  return {
    id: conversation.id,
    participant1_id: conversation.participant1Id,
    participant2_id: conversation.participant2Id,
    freight_id: conversation.freightId || null,
    last_message_at: conversation.lastMessageAt || new Date().toISOString(),
    created_at: conversation.createdAt || new Date().toISOString(),
    metadata: conversation.metadata || {},
  };
}

/**
 * Converte ConversationRow (SQL) para Conversation (TypeScript local)
 */
export function sqlToConversation(row: ConversationRow): any {
  return {
    id: row.id,
    participant1Id: row.participant1_id,
    participant2Id: row.participant2_id,
    freightId: row.freight_id || undefined,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    metadata: (row.metadata as any) || {},
  };
}

// ============================================
// MESSAGE ADAPTERS
// ============================================

type MessageRow = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

/**
 * Converte Message (TypeScript local) para formato SQL do Supabase
 */
export function messageToSQL(message: any): MessageInsert {
  return {
    id: message.id,
    conversation_id: message.conversationId,
    sender_id: message.senderId,
    content: message.content,
    message_type: message.type || 'text',
    attachments: message.attachments || [],
    is_read: message.isRead || false,
    read_at: message.readAt || null,
    created_at: message.createdAt || new Date().toISOString(),
    metadata: message.metadata || {},
  };
}

/**
 * Converte MessageRow (SQL) para Message (TypeScript local)
 */
export function sqlToMessage(row: MessageRow): any {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    type: row.message_type,
    attachments: (row.attachments as any) || [],
    isRead: row.is_read,
    readAt: row.read_at || undefined,
    createdAt: row.created_at,
    metadata: (row.metadata as any) || {},
  };
}

// ============================================
// PREFERRED ROUTE ADAPTERS
// ============================================

type PreferredRouteRow = Database['public']['Tables']['preferred_routes']['Row'];
type PreferredRouteInsert = Database['public']['Tables']['preferred_routes']['Insert'];

/**
 * Converte PreferredRoute (TypeScript local) para formato SQL do Supabase
 */
export function preferredRouteToSQL(route: any): PreferredRouteInsert {
  const sqlData: PreferredRouteInsert = {
    driver_id: route.driverId,
    origin: route.origin,
    destination: route.destination,
    origin_city: route.origin.city || null,
    origin_state: route.origin.state || null,
    destination_city: route.destination.city || null,
    destination_state: route.destination.state || null,
    priority: route.priority || 'medium',
    notes: route.notes || null,
    description: route.description || null,
    is_active: route.isActive ?? true,
    available_from: route.availableFrom || null,
    available_until: route.availableUntil || null,
    vehicle_types: route.vehicleTypes || [],
    capacity_kg: route.capacityKg ? parseFloat(route.capacityKg) : null,
    preferred_cargo_types: route.preferredCargoTypes || [],
    price_per_km: route.pricePerKm ? parseFloat(route.pricePerKm) : null,
    minimum_value: route.minimumValue ? parseFloat(route.minimumValue) : null,
    accepts_partial_load: route.acceptsPartialLoad ?? true,
    views_count: route.viewsCount || 0,
    contacts_count: route.contactsCount || 0,
    created_at: route.createdAt || new Date().toISOString(),
    updated_at: route.updatedAt || new Date().toISOString(),
    metadata: route.metadata || {},
  };

  // ✅ Só incluir ID se for UUID válido (formato: 8-4-4-4-12 caracteres hexadecimais)
  if (route.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(route.id)) {
    sqlData.id = route.id;
  }
  // ❌ Se não for UUID, deixar undefined para Supabase gerar

  return sqlData;
}

/**
 * Converte PreferredRouteRow (SQL) para PreferredRoute (TypeScript local)
 */
export function sqlToPreferredRoute(row: PreferredRouteRow): any {
  return {
    id: row.id,
    driverId: row.driver_id,
    origin: row.origin as any,
    destination: row.destination as any,
    priority: row.priority,
    notes: row.notes || undefined,
    description: row.description || undefined,
    isActive: row.is_active,
    availableFrom: row.available_from || undefined,
    availableUntil: row.available_until || undefined,
    vehicleTypes: row.vehicle_types || [],
    capacityKg: row.capacity_kg?.toString(),
    preferredCargoTypes: row.preferred_cargo_types || [],
    pricePerKm: row.price_per_km?.toString(),
    minimumValue: row.minimum_value?.toString(),
    acceptsPartialLoad: row.accepts_partial_load,
    viewsCount: row.views_count,
    contactsCount: row.contacts_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: (row.metadata as any) || {},
  };
}

// ============================================
// SOCIAL POST ADAPTERS
// ============================================

type SocialPostRow = Database['public']['Tables']['social_posts']['Row'];
type SocialPostInsert = Database['public']['Tables']['social_posts']['Insert'];

/**
 * Converte SocialPost (TypeScript local) para formato SQL do Supabase
 */
export function socialPostToSQL(post: SocialPost): SocialPostInsert {
  return {
    id: post.id,
    author_id: post.authorId,
    content: post.content,
    post_type: post.type || 'text',
    images: post.images || [],
    freight_id: post.freightId || null,
    likes_count: post.likes || 0,
    comments_count: post.comments || 0,
    shares_count: post.shares || 0,
    visibility: post.visibility || 'public',
    created_at: post.createdAt,
    updated_at: post.updatedAt,
    metadata: post.metadata || {},
  };
}

/**
 * Converte SocialPostRow (SQL) para SocialPost (TypeScript local)
 */
export function sqlToSocialPost(row: SocialPostRow): SocialPost {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: '', // Será preenchido via join
    authorAvatar: undefined, // Será preenchido via join
    content: row.content,
    type: row.post_type as SocialPost['type'],
    images: row.images || [],
    freightId: row.freight_id || undefined,
    likes: row.likes_count,
    likedBy: [], // Será preenchido via join
    comments: row.comments_count,
    shares: row.shares_count,
    visibility: row.visibility as SocialPost['visibility'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: (row.metadata as any) || undefined,
  };
}

// ============================================
// ACTIVITY LOG ADAPTERS
// ============================================

type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];
type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];

/**
 * Converte ActivityLog (TypeScript local) para formato SQL do Supabase
 */
export function activityLogToSQL(log: any): ActivityLogInsert {
  return {
    id: log.id,
    user_id: log.userId,
    action: log.action,
    entity_type: log.entityType,
    entity_id: log.entityId || null,
    description: log.description,
    metadata: log.metadata || {},
    ip_address: log.ipAddress || null,
    user_agent: log.userAgent || null,
    category: log.category || 'system',
    target_type: log.targetType || null,
    target_id: log.targetId || null,
    company_id: log.companyId || null,
    created_at: log.createdAt || new Date().toISOString(),
  };
}

/**
 * Converte ActivityLogRow (SQL) para ActivityLog (TypeScript local)
 */
export function sqlToActivityLog(row: ActivityLogRow): any {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id || undefined,
    description: row.description,
    metadata: (row.metadata as any) || {},
    ipAddress: row.ip_address || undefined,
    userAgent: row.user_agent || undefined,
    category: row.category,
    targetType: row.target_type || undefined,
    targetId: row.target_id || undefined,
    companyId: row.company_id || undefined,
    createdAt: row.created_at,
  };
}

// ============================================
// USER PREFERENCES ADAPTERS
// ============================================

type UserPreferencesRow = Database['public']['Tables']['user_preferences']['Row'];
type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert'];

/**
 * Converte UserPreferences (TypeScript local) para formato SQL do Supabase
 */
export function userPreferencesToSQL(prefs: any): UserPreferencesInsert {
  return {
    id: prefs.id,
    user_id: prefs.userId,
    notifications_enabled: prefs.notificationsEnabled ?? true,
    email_alerts: prefs.emailAlerts ?? true,
    sms_alerts: prefs.smsAlerts ?? false,
    push_notifications: prefs.pushNotifications ?? true,
    freight_alerts: prefs.freightAlerts ?? true,
    chat_notifications: prefs.chatNotifications ?? true,
    marketing_emails: prefs.marketingEmails ?? false,
    language: prefs.language || 'pt-BR',
    theme: prefs.theme || 'light',
    distance_unit: prefs.distanceUnit || 'km',
    currency: prefs.currency || 'BRL',
    notification_settings: prefs.notificationSettings || {},
    privacy_settings: prefs.privacySettings || {},
    created_at: prefs.createdAt || new Date().toISOString(),
    updated_at: prefs.updatedAt || new Date().toISOString(),
  };
}

/**
 * Converte UserPreferencesRow (SQL) para UserPreferences (TypeScript local)
 */
export function sqlToUserPreferences(row: UserPreferencesRow): any {
  return {
    id: row.id,
    userId: row.user_id,
    notificationsEnabled: row.notifications_enabled,
    emailAlerts: row.email_alerts,
    smsAlerts: row.sms_alerts,
    pushNotifications: row.push_notifications,
    freightAlerts: row.freight_alerts,
    chatNotifications: row.chat_notifications,
    marketingEmails: row.marketing_emails,
    language: row.language,
    theme: row.theme,
    distanceUnit: row.distance_unit,
    currency: row.currency,
    notificationSettings: (row.notification_settings as any) || {},
    privacySettings: (row.privacy_settings as any) || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse string numérica em formato brasileiro para number
 * Suporta: "R$ 1.500,00", "1500", "1500.00", "25 ton", "25.000 kg"
 */
function parseBrazilianNumber(value: string | undefined | null): number | null {
  if (!value) return null;
  // Remove símbolos de moeda, espaços e unidades
  const cleaned = value.replace(/[R$\s]/g, '').replace(/[a-zA-Z]/g, '').trim();
  if (!cleaned) return null;
  // Detectar formato brasileiro (1.500,00) vs americano (1500.00)
  if (cleaned.includes(',')) {
    // Formato brasileiro: remove pontos de milhar, troca vírgula por ponto
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  }
  // Formato americano ou número simples
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Converte campo opcional string para número ou null
 */
export function parseNumericField(value: string | undefined | null): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}