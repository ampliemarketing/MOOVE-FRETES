/**
 * Sistema Universal de Sincronização Supabase
 * Sincroniza todos os dados do usuário logado entre LocalStorage e Supabase
 */

import { supabase } from './supabase/client';
import { database } from './database';
import type {
  User,
  Driver,
  Company,
  Freight,
  Quote,
  Chat,
  Message,
  Notification,
  SocialPost,
  Transaction,
  TrackingEvent,
  Rating,
  PreferredRoute
} from './database/schema';

// ============================================
// TYPES
// ============================================

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
}

export interface SyncStatus {
  lastSync: string | null;
  pendingSync: boolean;
  autoSync: boolean;
}

// ============================================
// SYNC STATUS MANAGEMENT
// ============================================

const SYNC_STATUS_KEY = 'maisfrete:sync_status';

export function getSyncStatus(): SyncStatus {
  const stored = localStorage.getItem(SYNC_STATUS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    lastSync: null,
    pendingSync: false,
    autoSync: true
  };
}

export function updateSyncStatus(status: Partial<SyncStatus>) {
  const current = getSyncStatus();
  const updated = { ...current, ...status };
  localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
}

// ============================================
// USER DATA SYNC
// ============================================

/**
 * Sincroniza perfil do usuário
 */
export async function syncUserProfile(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    // 1. Carregar do LocalStorage
    const localUser = await database.users.getById(userId);
    
    if (localUser.success && localUser.data) {
      const user = localUser.data;
      
      // 2. Sincronizar com Supabase
      const { error } = await supabase
        .from('profiles')  // ✅ Alterado de 'users' para 'profiles'
        .upsert({
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          cpf: user.cpf,
          cnpj: user.cnpj,
          user_type: user.userType,
          avatar_url: user.profile?.avatar,
          bio: user.profile?.bio,
          rating: user.profile?.rating || 0,
          total_freights: user.profile?.totalFreights || 0,
          completed_freights: user.profile?.completedFreights || 0,
          verification_status: user.profile?.verificationStatus || 'pending',
          updated_at: new Date().toISOString(),
          metadata: {
            gamification: user.gamification,
            preferences: user.preferences
          }
        });
      
      if (error) {
        errors.push(`User profile: ${error.message}`);
      } else {
        synced++;
      }
    }
  } catch (error) {
    errors.push(`User profile error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { success: errors.length === 0, synced, errors };
}

/**
 * Carrega perfil do usuário do Supabase
 */
export async function loadUserProfileFromSupabase(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')  // ✅ Alterado de 'users' para 'profiles'
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !data) return null;
    
    const user: User = {
      id: data.id,
      email: data.email,
      userType: data.user_type,
      name: data.name,
      phone: data.phone,
      cpf: data.cpf,
      cnpj: data.cnpj,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      profile: {
        avatar: data.avatar_url,
        bio: data.bio,
        rating: data.rating,
        totalFreights: data.total_freights,
        completedFreights: data.completed_freights,
        verificationStatus: data.verification_status
      },
      gamification: data.metadata?.gamification || {
        level: 1,
        xp: 0,
        badges: [],
        achievements: []
      },
      preferences: data.metadata?.preferences || {
        notifications: true,
        emailAlerts: true
      }
    };
    
    // 🚚 Se for caminhoneiro, carregar dados adicionais da tabela drivers
    if (data.user_type === 'caminhoneiro') {
      try {
        
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('current_location, preferred_routes, vehicle_types, trailer_type, available, availability_expires_at, address, vehicle_plate, cnh')
          .eq('user_id', userId)
          .single();
        
        if (driverError) {
          console.error('❌ [loadUserProfileFromSupabase] Erro ao carregar driver:', driverError);
          console.error('❌ [loadUserProfileFromSupabase] Detalhes:', {
            message: driverError.message,
            details: driverError.details,
            hint: driverError.hint,
            code: driverError.code
          });
        }
        
        if (driverData) {
          
          // Adicionar current_location ao user
          if (driverData.current_location) {
            user.currentLocation = driverData.current_location;
          }
          
          // ✅ NOVO: Adicionar address (contém city, state, etc)
          if (driverData.address) {
            user.address = driverData.address;
            // Também preencher location a partir da cidade/estado se disponível
            if (driverData.address.city && driverData.address.state) {
              user.location = `${driverData.address.city}, ${driverData.address.state}`;
            }
          } else {
          }
          
          // Adicionar rotas preferidas
          if (driverData.preferred_routes) {
            user.preferredRoutes = driverData.preferred_routes;
          }
          
          // Adicionar tipos de veículos e carrocerias
          if (driverData.vehicle_types) {
            user.vehicleTypes = driverData.vehicle_types;
          }
          
          // ✅ CORRIGIDO: trailer_type (singular) ao invés de trailer_types (plural)
          if (driverData.trailer_type) {
            user.trailerTypes = [driverData.trailer_type]; // Converter string para array
          }
          
          // Adicionar disponibilidade
          if (driverData.available !== undefined) {
            user.available = driverData.available;
          }
          
          if (driverData.availability_expires_at) {
            user.availabilityExpiresAt = driverData.availability_expires_at;
          }
        } else {
        }
      } catch (driverError) {
        console.error('⚠️ [loadUserProfileFromSupabase] Exceção ao carregar motorista:', driverError);
      }
    }
    
    return user;
  } catch (error) {
    console.error('Error loading user from Supabase:', error);
    return null;
  }
}

/**
 * Verifica se o perfil do usuário está completo
 * ⚠️ ATUALIZADO: Como o cadastro unificado cria tudo de uma vez, 
 * agora apenas verifica se o perfil existe no banco
 */
export async function checkProfileComplete(userId: string): Promise<{
  isComplete: boolean;
  userType?: 'caminhoneiro' | 'transportadora' | 'agenciador';
  missingData?: string[];
} | null> {
  try {
    
    // Como o cadastro unificado cria perfil + driver/company de uma vez,
    // apenas verificamos se o profile existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();
    
    
    if (profileError || !profile) {
      return {
        isComplete: false,
        missingData: ['profile']
      };
    }

    // Se o profile existe, o cadastro unificado foi concluído com sucesso
    return {
      isComplete: true,
      userType: profile.user_type
    };
  } catch (error) {
    console.error('❌ [checkProfileComplete] Erro ao verificar completude do perfil:', error);
    return {
      isComplete: false,
      missingData: ['error']
    };
  }
}

// ============================================
// FREIGHTS SYNC
// ============================================

/**
 * Sincroniza fretes do usuário
 */
export async function syncFreights(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    // Carregar fretes do LocalStorage
    const localFreights = await database.freights.getByCustomer(userId);
    
    if (localFreights.success && localFreights.data) {
      for (const freight of localFreights.data) {
        try {
          // ✅ VERIFICAR SE JÁ EXISTE NO SUPABASE (evitar duplicatas)
          const { data: existingFreight, error: checkError } = await supabase
            .from('freights')
            .select('id, updated_at')
            .eq('id', freight.id)
            .single();
          
          // Se já existe e não foi modificado, pular
          if (existingFreight && !checkError) {
            const localUpdated = new Date(freight.updatedAt || freight.createdAt).getTime();
            const remoteUpdated = new Date(existingFreight.updated_at).getTime();
            
            // Só sincronizar se a versão local for mais nova
            if (localUpdated <= remoteUpdated) {
              continue; // Pular este frete
            }
          }
          
          const { error } = await supabase
            .from('freights')
            .upsert({
              id: freight.id,
              publisher_id: userId,
              title: `${freight.cargo} - ${freight.origin.city}/${freight.origin.state} → ${freight.destination.city}/${freight.destination.state}`,
              description: freight.observations || '',
              cargo_type: freight.cargoType,
              weight_kg: parseFloat(freight.weight.replace(/[^\d.,]/g, '').replace(',', '.')),
              origin_address: freight.origin.address || '',
              origin_city: freight.origin.city,
              origin_state: freight.origin.state,
              destination_address: freight.destination.address || '',
              destination_city: freight.destination.city,
              destination_state: freight.destination.state,
              pickup_date: freight.pickupDate,
              delivery_date: freight.deliveryDate,
              status: freight.status === 'active' ? 'open' : 
                      freight.status === 'in-transit' ? 'in_transit' : 
                      freight.status === 'completed' ? 'delivered' : 
                      freight.status,
              visibility: 'public',
              vehicle_types: [freight.truckType],
              views_count: freight.views || 0,
              quotes_count: freight.quotesCount || 0,
              created_at: freight.createdAt,
              updated_at: new Date().toISOString(),
              metadata: {
                customerName: freight.customerName,
                type: freight.type,
                exposureLevel: freight.exposureLevel,
                price: freight.price,
                paymentTerms: freight.paymentTerms,
                category: freight.category,
                bodyType: freight.bodyType,
                requiresInsurance: freight.requiresInsurance,
                requiresTracking: freight.requiresTracking,
                dangerousCargo: freight.dangerousCargo
              }
            }, {
              onConflict: 'id', // ✅ Usar UPSERT com controle de conflito
              ignoreDuplicates: false // ✅ Atualizar se já existir
            });
          
          if (error) {
            errors.push(`Freight ${freight.id}: ${error.message}`);
          } else {
            synced++;
          }
        } catch (err) {
          errors.push(`Freight ${freight.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Freights sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { success: errors.length === 0, synced, errors };
}

/**
 * Carrega fretes do usuário do Supabase
 */
export async function loadFreightsFromSupabase(userId: string): Promise<Freight[]> {
  try {
    const { data, error } = await supabase
      .from('freights')
      .select('*')
      .eq('publisher_id', userId)
      .order('created_at', { ascending: false });
    
    if (error || !data) return [];
    
    const freights: Freight[] = data.map(f => ({
      id: f.id,
      customerId: f.publisher_id,
      customerName: f.metadata?.customerName || 'Usuário',
      type: f.metadata?.type || 'regular',
      exposureLevel: f.metadata?.exposureLevel || 'Média exposição',
      origin: {
        city: f.origin_city,
        state: f.origin_state,
        address: f.origin_address
      },
      destination: {
        city: f.destination_city,
        state: f.destination_state,
        address: f.destination_address
      },
      cargo: f.title.split(' - ')[0] || f.cargo_type,
      cargoType: f.cargo_type,
      weight: `${f.weight_kg || 0} kg`,
      truckType: f.vehicle_types?.[0] || 'Caminhão',
      category: f.metadata?.category || 'Geral',
      price: f.metadata?.price || 'A combinar',
      pickupDate: f.pickup_date,
      deliveryDate: f.delivery_date,
      status: f.status === 'open' ? 'active' :
              f.status === 'in_transit' ? 'in-transit' :
              f.status === 'delivered' ? 'completed' :
              f.status as any,
      observations: f.description,
      views: f.views_count || 0,
      quotesCount: f.quotes_count || 0,
      createdAt: f.created_at,
      updatedAt: f.updated_at
    }));
    
    return freights;
  } catch (error) {
    console.error('Error loading freights from Supabase:', error);
    return [];
  }
}

// ============================================
// QUOTES SYNC
// ============================================

/**
 * Sincroniza cotações do usuário
 */
export async function syncQuotes(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    // Carregar cotações onde o usuário é o bidder
    const localQuotes = await database.quotes.getByProvider(userId);
    
    if (localQuotes.success && localQuotes.data) {
      for (const quote of localQuotes.data) {
        try {
          const { error } = await supabase
            .from('quotes')
            .upsert({
              id: quote.id,
              freight_id: quote.freightId,
              bidder_id: userId,
              proposed_value: parseFloat(quote.proposedPrice?.replace(/[^\d.,]/g, '').replace(',', '.') || '0'),
              delivery_time_days: parseInt(quote.deliveryEstimate || '0'),
              observations: quote.observations,
              status: quote.status,
              valid_until: quote.validUntil,
              created_at: quote.createdAt,
              updated_at: new Date().toISOString(),
              metadata: {
                providerName: quote.providerName,
                providerType: quote.providerType,
                provider: quote.provider
              }
            });
          
          if (error) {
            errors.push(`Quote ${quote.id}: ${error.message}`);
          } else {
            synced++;
          }
        } catch (err) {
          errors.push(`Quote ${quote.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Quotes sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { success: errors.length === 0, synced, errors };
}

/**
 * Cria uma nova cotação e sincroniza com Supabase
 */
export async function createQuoteAndSync(quote: Partial<Quote>): Promise<{ success: boolean; data?: Quote; error?: string; isDuplicate?: boolean }> {
  try {
    
    // ✅ VERIFICAR SE JÁ EXISTE COTAÇÃO ANTES DE TENTAR CRIAR
    
    const { data: existingQuote, error: checkError } = await supabase
      .from('quotes')
      .select('*')
      .eq('freight_id', quote.freightId)
      .eq('bidder_id', quote.providerId)
      .maybeSingle();
    
    if (checkError) {
      console.error('❌ Erro ao verificar cotação existente:', checkError);
      // Continuar mesmo com erro na verificação
    }
    
    // Se já existe, retornar a cotação existente COM SUCESSO
    if (existingQuote) {
      
      // Transformar de volta para o formato da aplicação
      const quote: Quote = {
        id: existingQuote.id,
        freightId: existingQuote.freight_id,
        providerId: existingQuote.bidder_id,
        providerName: existingQuote.metadata?.providerName || '',
        providerType: existingQuote.metadata?.providerType || 'caminhoneiro',
        proposedPrice: existingQuote.proposed_value?.toString() || '0',
        deliveryEstimate: existingQuote.delivery_time_days?.toString() || '',
        observations: existingQuote.observations || '',
        status: existingQuote.status || 'pending',
        validUntil: existingQuote.valid_until,
        provider: existingQuote.metadata?.provider || {
          rating: 0,
          completedFreights: 0,
          responseTime: '2h'
        },
        createdAt: existingQuote.created_at,
        updatedAt: existingQuote.updated_at
      };
      
      return { 
        success: true, // ✅ NÃO É ERRO - é sucesso com cotação existente
        data: quote,
        isDuplicate: true // Flag para informar que é duplicata
      };
    }
    
    // Gerar ID se não existir
    const quoteId = quote.id || crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Preparar dados para o Supabase
    // ✅ CORRIGIDO: Melhor parsing de deliveryEstimate
    const parseDeliveryEstimate = (estimate: string | undefined): number => {
      if (!estimate) return 3;
      // Se for um número, usar diretamente
      const numMatch = estimate.match(/\d+/);
      if (numMatch) {
        return parseInt(numMatch[0]);
      }
      // Padrão: 3 dias
      return 3;
    };
    
    // ✅ CORRIGIDO: Melhor parsing de proposedPrice com contexto BRASILEIRO
    const parseProposedPrice = (price: string | undefined): number => {
      if (!price) return 0;
      
      // Remover tudo exceto números, vírgula e ponto
      let cleanPrice = price.toString().replace(/[^\d.,]/g, '');
      
      // CONTEXTO BRASILEIRO:
      // "1.234,56" → 1234.56 (padrão BR: ponto = milhares, vírgula = decimal)
      // "1234,56" → 1234.56 (só vírgula = decimal)
      // "1.234" → 1234 (só ponto com 3+ dígitos após = milhares)
      // "12.34" → 12.34 (só ponto com 1-2 dígitos após = decimal americano)
      
      if (cleanPrice.includes(',') && cleanPrice.includes('.')) {
        // Formato brasileiro completo: 1.234,56
        cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
      } else if (cleanPrice.includes(',')) {
        // Só vírgula: assumir decimal brasileiro
        cleanPrice = cleanPrice.replace(',', '.');
      } else if (cleanPrice.includes('.')) {
        // Só ponto: verificar se é milhares ou decimal
        const parts = cleanPrice.split('.');
        const afterDot = parts[parts.length - 1];
        
        // Se tem exatamente 3 dígitos após o último ponto → separador de milhares
        if (afterDot.length === 3 && parts.length === 2) {
          // Ex: "7.777" → remover ponto → "7777"
          cleanPrice = cleanPrice.replace(/\./g, '');
        }
        // Se tem 1-2 dígitos → decimal americano (manter como está)
        // Ex: "7.78" → manter "7.78"
        // Se tem múltiplos pontos → milhares (ex: "1.234.567")
        else if (parts.length > 2) {
          cleanPrice = cleanPrice.replace(/\./g, '');
        }
      }
      
      const parsed = parseFloat(cleanPrice);
      return isNaN(parsed) ? 0 : parsed;
    };
    
    const supabaseQuote = {
      id: quoteId,
      freight_id: quote.freightId,
      bidder_id: quote.providerId,
      proposed_value: parseProposedPrice(quote.proposedPrice),
      delivery_time_days: parseDeliveryEstimate(quote.deliveryEstimate?.toString()),
      observations: quote.observations || '',
      status: quote.status || 'pending',
      valid_until: quote.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: now,
      updated_at: now,
      metadata: {
        providerName: quote.providerName,
        providerType: quote.providerType,
        provider: quote.provider || {}
      }
    };
    
    // Inserir no Supabase
    const { data, error } = await supabase
      .from('quotes')
      .insert(supabaseQuote)
      .select()
      .single();
    
    if (error) {
      console.error('❌ ❌ Erro ao criar cotação no Supabase:', error);
      
      // Tratar erro de duplicata especificamente (código 23505)
      if (error.code === '23505') {
        return { 
          success: false, 
          error: 'DUPLICATE_QUOTE', // Código especial para detectar duplicata
          isDuplicate: true 
        };
      }
      
      return { success: false, error: error.message };
    }
    
    // Transformar de volta para o formato da aplicação
    const newQuote: Quote = {
      id: data.id,
      freightId: data.freight_id,
      providerId: data.bidder_id,
      providerName: data.metadata?.providerName || '',
      providerType: data.metadata?.providerType || 'caminhoneiro',
      proposedPrice: data.proposed_value?.toString() || '0',
      deliveryEstimate: data.delivery_time_days?.toString() || '',
      observations: data.observations || '',
      status: data.status || 'pending',
      validUntil: data.valid_until || supabaseQuote.valid_until,
      provider: data.metadata?.provider || {
        rating: 0,
        completedFreights: 0,
        responseTime: '2h'
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return { success: true, data: newQuote };
  } catch (error) {
    console.error('❌ Erro inesperado ao criar cotação:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Atualiza status de cotação e sincroniza com Supabase
 */
export async function updateQuoteStatusAndSync(quoteId: string, status: Quote['status']): Promise<{ success: boolean; data?: Quote; error?: string }> {
  try {
    
    const now = new Date().toISOString();
    const updates: any = {
      status,
      updated_at: now
    };
    
    // Adicionar timestamp específico se aceita ou rejeitada
    if (status === 'accepted') {
      updates.accepted_at = now;
    } else if (status === 'rejected') {
      updates.rejected_at = now;
    }
    
    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', quoteId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao atualizar cotação no Supabase:', error);
      return { success: false, error: error.message };
    }
    
    // Transformar de volta para o formato da aplicação
    const updatedQuote: Quote = {
      id: data.id,
      freightId: data.freight_id,
      providerId: data.bidder_id,
      providerName: data.metadata?.providerName || '',
      providerType: data.metadata?.providerType || 'transportadora',
      proposedPrice: data.proposed_value?.toString() || '0',
      deliveryEstimate: data.delivery_time_days?.toString() || '',
      observations: data.observations || '',
      status: data.status || 'pending',
      validUntil: data.valid_until,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      acceptedAt: data.accepted_at,
      rejectedAt: data.rejected_at
    };
    
    return { success: true, data: updatedQuote };
  } catch (error) {
    console.error('❌ Erro inesperado ao atualizar cotação:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Carrega cotações de um frete do Supabase
 */
export async function loadQuotesFromSupabase(freightId: string): Promise<Quote[]> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('freight_id', freightId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao carregar cotações do Supabase:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Transformar para o formato da aplicação
    const quotes: Quote[] = data.map((q: any) => ({
      id: q.id,
      freightId: q.freight_id,
      providerId: q.bidder_id,
      providerName: q.metadata?.providerName || '',
      providerType: q.metadata?.providerType || 'transportadora',
      proposedPrice: q.proposed_value?.toString() || '0',
      deliveryEstimate: q.delivery_time_days?.toString() || '',
      observations: q.observations || '',
      status: q.status || 'pending',
      validUntil: q.valid_until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: q.created_at,
      updatedAt: q.updated_at,
      acceptedAt: q.accepted_at,
      rejectedAt: q.rejected_at
    }));
    
    return quotes;
  } catch (error) {
    console.error('❌ Erro inesperado ao carregar cotações:', error);
    return [];
  }
}

// ============================================
// NOTIFICATIONS SYNC
// ============================================

/**
 * Sincroniza notificações do usuário
 */
export async function syncNotifications(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    
    const localNotifications = await database.notifications.getByUser(userId);
    
    if (localNotifications.success && localNotifications.data) {
      for (const notification of localNotifications.data) {
        try {
          const { error } = await supabase
            .from('notifications')
            .upsert({
              id: notification.id,
              user_id: userId,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              icon: notification.icon,
              action_url: notification.actionUrl,
              is_read: notification.read,
              read_at: notification.readAt,
              created_at: notification.createdAt,
              metadata: {
                relatedId: notification.relatedId,
                relatedType: notification.relatedType,
                actionLabel: notification.actionLabel
              }
            });
          
          if (error) {
            errors.push(`Notification ${notification.id}: ${error.message}`);
          } else {
            synced++;
          }
        } catch (err) {
          errors.push(`Notification ${notification.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Notifications sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { success: errors.length === 0, synced, errors };
}

/**
 * Carrega notificações do Supabase
 */
export async function loadNotificationsFromSupabase(userId: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error || !data) return [];
    
    const notifications: Notification[] = data.map(n => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      icon: n.icon,
      relatedId: n.metadata?.relatedId,
      relatedType: n.metadata?.relatedType,
      actionUrl: n.action_url,
      actionLabel: n.metadata?.actionLabel,
      read: n.is_read,
      createdAt: n.created_at,
      readAt: n.read_at
    }));
    
    return notifications;
  } catch (error) {
    console.error('Error loading notifications from Supabase:', error);
    return [];
  }
}

// ============================================
// MESSAGES/CHAT SYNC
// ============================================

/**
 * Sincroniza mensagens do usuário
 */
export async function syncMessages(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    
    const chats = await database.chats.getByUser(userId);
    
    if (chats.success && chats.data) {
      for (const chat of chats.data) {
        try {
          // Sincronizar conversa
          const otherUserId = chat.participants.find(p => p !== userId);
          if (!otherUserId) continue;
          
          // Verificar se conversa já existe
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(participant1_id.eq.${userId},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${userId})`)
            .single();
          
          let conversationId = existingConv?.id || chat.id;
          
          if (!existingConv) {
            // Criar conversa
            const [p1, p2] = [userId, otherUserId].sort();
            const { data: newConv, error: convError } = await supabase
              .from('conversations')
              .insert({
                id: chat.id,
                participant1_id: p1,
                participant2_id: p2,
                freight_id: chat.freightId,
                created_at: chat.createdAt,
                last_message_at: chat.lastMessage?.timestamp || chat.createdAt
              })
              .select()
              .single();
            
            if (convError) {
              errors.push(`Conversation ${chat.id}: ${convError.message}`);
              continue;
            }
            
            conversationId = newConv.id;
            synced++;
          }
          
          // Sincronizar mensagens
          const messages = await database.messages.getByChat(chat.id);
          if (messages.success && messages.data) {
            for (const msg of messages.data) {
              try {
                const { error: msgError } = await supabase
                  .from('messages')
                  .upsert({
                    id: msg.id,
                    conversation_id: conversationId,
                    sender_id: msg.senderId,
                    content: msg.content,
                    message_type: msg.type,
                    attachments: msg.attachments || [],
                    is_read: msg.isRead,
                    created_at: msg.createdAt
                  });
                
                if (msgError) {
                  errors.push(`Message ${msg.id}: ${msgError.message}`);
                } else {
                  synced++;
                }
              } catch (err) {
                errors.push(`Message ${msg.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
              }
            }
          }
        } catch (err) {
          errors.push(`Chat ${chat.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Messages sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { success: errors.length === 0, synced, errors };
}

// ============================================
// SOCIAL POSTS SYNC
// ============================================

/**
 * Sincroniza posts sociais do usuário
 */
export async function syncSocialPosts(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    
    const posts = await database.social.getPostsByAuthor(userId);
    
    if (posts.success && posts.data) {
      for (const post of posts.data) {
        try {
          const { error } = await supabase
            .from('social_posts')
            .upsert({
              id: post.id,
              author_id: userId,
              content: post.content,
              post_type: 'text',
              images: post.images || [],
              likes_count: post.likes || 0,
              comments_count: post.comments || 0,
              shares_count: post.shares || 0,
              visibility: 'public',
              created_at: post.createdAt,
              updated_at: post.updatedAt || post.createdAt,
              metadata: {
                authorName: post.authorName,
                authorAvatar: post.authorAvatar,
                authorType: post.authorType,
                tags: post.tags,
                location: post.location
              }
            });
          
          if (error) {
            errors.push(`Post ${post.id}: ${error.message}`);
          } else {
            synced++;
          }
        } catch (err) {
          errors.push(`Post ${post.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Social posts sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { success: errors.length === 0, synced, errors };
}

// ============================================
// TRANSACTIONS SYNC
// ============================================

/**
 * Sincroniza transações do usuário
 */
export async function syncTransactions(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    
    const transactions = await database.transactions.getByUser(userId);
    
    if (transactions.success && transactions.data) {
      for (const transaction of transactions.data) {
        try {
          const amount = parseFloat(transaction.amount.replace(/[^\d.,]/g, '').replace(',', '.'));
          const { error } = await supabase
            .from('transactions')
            .upsert({
              id: transaction.id,
              freight_id: transaction.freightId,
              quote_id: transaction.quoteId,
              payer_id: transaction.payerId,
              receiver_id: transaction.receiverId,
              amount: amount,
              fee: 0,
              net_amount: amount,
              payment_method: transaction.paymentMethod,
              payment_status: transaction.status,
              transaction_type: 'freight_payment',
              created_at: transaction.createdAt,
              updated_at: new Date().toISOString(),
              metadata: {
                payerName: transaction.payerName,
                receiverName: transaction.receiverName,
                gatewayTransactionId: transaction.gatewayTransactionId,
                gatewayResponse: transaction.gatewayResponse
              }
            });
          
          if (error) {
            errors.push(`Transaction ${transaction.id}: ${error.message}`);
          } else {
            synced++;
          }
        } catch (err) {
          errors.push(`Transaction ${transaction.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Transactions sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { success: errors.length === 0, synced, errors };
}

// ============================================
// RATINGS SYNC
// ============================================

/**
 * Sincroniza avaliações do usuário
 */
export async function syncRatings(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    
    // Avaliações feitas pelo usuário
    const ratings = await database.ratings.getByEvaluator(userId);
    
    if (ratings.success && ratings.data) {
      for (const rating of ratings.data) {
        try {
          const { error } = await supabase
            .from('ratings')
            .upsert({
              id: rating.id,
              freight_id: rating.freightId,
              evaluator_id: userId,
              evaluator_name: rating.evaluatorName || '',
              evaluator_type: rating.evaluatorType || '',
              target_id: rating.driverId || rating.targetId,
              target_name: rating.targetName || '',
              target_type: rating.targetType || 'caminhoneiro',
              overall_rating: rating.overallRating,
              punctuality_rating: rating.punctualityRating || 0,
              communication_rating: rating.communicationRating || 0,
              professionalism_rating: rating.professionalismRating || 0,
              comment: rating.comment,
              freight_code: rating.freightCode || null,
              created_at: rating.createdAt,
              updated_at: rating.updatedAt || rating.createdAt
            });
          
          if (error) {
            errors.push(`Rating ${rating.id}: ${error.message}`);
          } else {
            synced++;
          }
        } catch (err) {
          errors.push(`Rating ${rating.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Ratings sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { success: errors.length === 0, synced, errors };
}

// ============================================
// DRIVERS SYNC
// ============================================

/**
 * Sincroniza perfil de motorista (se o usuário for caminhoneiro)
 */
export async function syncDriverProfile(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    
    // Buscar pelo userId, não pelo id do driver
    const driver = await database.drivers.getByUserId(userId);
    
    if (driver.success && driver.data) {
      const driverData = driver.data;
      
      // ✅ SALVANDO TODOS OS DADOS DO MOTORISTA
      const { error } = await supabase
        .from('drivers')
        .upsert({
          user_id: userId, // ✅ UPSERT by user_id (UNIQUE constraint)
          // Dados Pessoais
          name: driverData.name || '',
          cpf: driverData.cpf || '',
          rg: driverData.rg || '',
          birth_date: driverData.birthDate || null,
          phone: driverData.phone || '',
          profile_image: driverData.profileImage || '',
          // Documentos CNH
          cnh: driverData.cnh || '',
          cnh_category: driverData.cnhCategory || 'AB',
          cnh_expiry: driverData.cnhExpiry || driverData.cnhValidity || null,
          // RNTRC
          rntrc: driverData.rntrc || '',
          rntrc_expiry: driverData.rntrcExpiry || null,
          // Endereço (JSONB)
          address: driverData.address || {},
          // Veículo
          vehicle_type: driverData.vehicleTypes?.[0] || driverData.vehicle?.type || '',
          vehicle_plate: driverData.vehiclePlate || driverData.vehicle?.plate || '',
          vehicle_model: driverData.vehicleModel || driverData.vehicle?.model || '',
          vehicle_year: driverData.vehicleYear || driverData.vehicle?.year || '',
          renavam: driverData.renavam || '',
          antt_vehicle: driverData.anttVehicle || '',
          // Arrays
          vehicle_types: driverData.vehicleTypes || [],
          body_types: driverData.bodyTypes || [],
          vehicle_capacity: driverData.vehicleCapacity || 0,
          // Status e Avaliação
          experience_years: driverData.experienceYears || 0,
          specializations: driverData.vehicleTypes || [],
          available: driverData.status === 'available',
          rating: driverData.rating || 0,
          completed_trips: driverData.completedTrips || 0,
          current_location: driverData.currentLocation || null,
          preferred_routes: driverData.preferredRoutes || [],
          created_at: driverData.createdAt,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id' // ✅ Resolver conflitos pela coluna user_id
        });
      
      if (error) {
        console.error('❌ Erro ao sincronizar driver:', error);
        errors.push(`Driver profile: ${error.message}`);
      } else {
        synced++;
      }
    }
  } catch (error) {
    console.error('❌ Erro inesperado ao sincronizar driver:', error);
    errors.push(`Driver sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { success: errors.length === 0, synced, errors };
}

// ============================================
// COMPANIES SYNC
// ============================================

/**
 * Sincroniza perfil de empresa (se o usuário for transportadora)
 */
export async function syncCompanyProfile(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    // ✅ Verificar tipo de usuário antes de tentar sincronizar
    const profile = await database.users.getById(userId);
    if (!profile.success || !profile.data) {
      return { success: true, synced: 0, errors: [] }; // Usuário não encontrado, pular sync
    }
    
    const userType = profile.data.userType;
    // ✅ Só sincronizar se for transportadora, embarcador ou agenciador
    if (userType !== 'transportadora' && userType !== 'embarcador' && userType !== 'agenciador') {
      return { success: true, synced: 0, errors: [] }; // Não é empresa, pular sync silenciosamente
    }
    
    const company = await database.companies.getByUserId(userId);
    
    if (company.success && company.data) {
      const companyData = company.data;
      
      // Verificar se empresa já existe no Supabase
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      // Preparar dados da empresa
      const companyDataToSync = {
        user_id: userId,
        // Dados Principais
        company_name: companyData.companyName || companyData.name || '',
        trading_name: companyData.tradingName || companyData.name || '',
        cnpj: companyData.cnpj || '',
        company_type: companyData.type || companyData.businessType || 'transportadora',
        // Inscrições
        state_registration: companyData.stateRegistration || '',
        municipal_registration: companyData.municipalRegistration || '',
        // Contato
        phone: companyData.phone || '',
        corporate_email: companyData.corporateEmail || companyData.email || '',
        website: companyData.contact?.website || '',
        description: companyData.description || '',
        // Endereço (JSONB)
        address: companyData.address || {
          cep: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: ''
        },
        // Representante Legal
        representative_name: companyData.representativeName || '',
        representative_cpf: companyData.representativeCpf || '',
        representative_rg: companyData.representativeRg || '',
        representative_phone: companyData.representativePhone || '',
        representative_email: companyData.representativeEmail || '',
        representative_role: companyData.representativeRole || '',
        representative_cnh: companyData.representativeCnh || '',
        // RNTRC
        rntrc: companyData.rntrc || '',
        rntrc_expiry: companyData.rntrcExpiry || null,
        // Agenciador (Pessoa Física)
        is_individual: companyData.isIndividual || false,
        main_cpf: companyData.mainCpf || '',
        // Arrays e Dados Adicionais
        certifications: companyData.certifications || [],
        fleet_size: companyData.fleetSize || 0,
        operating_states: companyData.operatingStates || companyData.operatingRegions || [],
        // Metadata
        updated_at: new Date().toISOString()
      };
      
      let error;
      
      if (existingCompany) {
        // UPDATE se já existe
        const result = await supabase
          .from('companies')
          .update(companyDataToSync)
          .eq('user_id', userId)
          .select();
        error = result.error;
      } else {
        // INSERT se não existe
        const result = await supabase
          .from('companies')
          .insert({
            ...companyDataToSync,
            created_at: companyData.createdAt || new Date().toISOString()
          })
          .select();
        error = result.error;
      }
      
      if (error) {
        console.error('❌ Erro ao sincronizar empresa:', error);
        errors.push(`Company profile: ${error.message}`);
      } else {
        synced++;
      }
    }
  } catch (error) {
    console.error('❌ Erro inesperado ao sincronizar empresa:', error);
    errors.push(`Company sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { success: errors.length === 0, synced, errors };
}

// ============================================
// PREFERRED ROUTES SYNC
// ============================================

/**
 * Sincroniza rotas preferidas do motorista
 */
export async function syncPreferredRoutes(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {

    // Resolver drivers.id a partir do user_id (FK exige drivers.id, não auth.uid)
    const { data: driverRow, error: driverLookupError } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (driverLookupError || !driverRow) {
      // Usuário não é motorista — pular sync de rotas sem erro
      return { success: true, synced: 0, errors: [] };
    }

    const driverId = driverRow.id;

    const routes = await database.preferredRoutes.getByDriver(userId);

    if (routes.success && routes.data) {
      for (const route of routes.data) {
        try {
          const { error } = await supabase
            .from('preferred_routes')
            .upsert({
              id: route.id,
              driver_id: driverId,
              origin_city: route.origin.city,
              origin_state: route.origin.state,
              destination_city: route.destination.city,
              destination_state: route.destination.state,
              is_active: route.isActive !== false,
              is_public: route.visibility === 'public',
              frequency: route.frequency || 'occasional',
              created_at: route.createdAt,
              updated_at: new Date().toISOString(),
              metadata: {
                preferences: route.preferences,
                notes: route.notes
              }
            });
          
          if (error) {
            errors.push(`Route ${route.id}: ${error.message}`);
          } else {
            synced++;
          }
        } catch (err) {
          errors.push(`Route ${route.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Routes sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { success: errors.length === 0, synced, errors };
}

// ============================================
// ACTIVITY LOGS SYNC
// ============================================

/**
 * Sincroniza logs de atividade do usuário
 */
export async function syncActivityLogs(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    
    const logs = await database.activityLogs.getByUser(userId);
    
    if (logs.success && logs.data) {
      for (const log of logs.data) {
        try {
          const { error } = await supabase
            .from('activity_logs')
            .upsert({
              id: log.id,
              user_id: userId,
              action: log.action,
              entity_type: log.entityType,
              entity_id: log.entityId,
              description: log.description,
              ip_address: log.metadata?.ipAddress || null,
              user_agent: log.metadata?.userAgent || null,
              created_at: log.timestamp,
              metadata: log.metadata
            });
          
          if (error) {
            errors.push(`Log ${log.id}: ${error.message}`);
          } else {
            synced++;
          }
        } catch (err) {
          errors.push(`Log ${log.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Activity logs sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { success: errors.length === 0, synced, errors };
}

// ============================================
// MASTER SYNC FUNCTION
// ============================================

/**
 * Sincroniza TODOS os dados do usuário logado
 */
export async function syncAllUserData(userId: string): Promise<{
  success: boolean;
  totalSynced: number;
  results: Record<string, SyncResult>;
}> {
  // Verificar se Supabase está disponível antes de tentar sincronizar
  try {
    const { checkSupabaseAvailability } = await import('./offline-mode');
    const isAvailable = await checkSupabaseAvailability();
    
    if (!isAvailable) {
      // Supabase offline - não sincronizar (isso é normal)
      return {
        success: true, // Retornar sucesso porque o sistema funciona sem Supabase
        totalSynced: 0,
        results: {}
      };
    }
  } catch (error) {
    // Se houver erro ao verificar disponibilidade, não sincronizar
    return {
      success: true,
      totalSynced: 0,
      results: {}
    };
  }
  
  updateSyncStatus({ pendingSync: true });
  
  const results: Record<string, SyncResult> = {};
  let totalSynced = 0;
  
  try {
    // Sincronizar cada tipo de dado com timeout individual
    const syncWithTimeout = async (
      syncFn: () => Promise<SyncResult>,
      name: string,
      timeoutMs: number = 5000
    ): Promise<SyncResult> => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), timeoutMs);
        });
        
        return await Promise.race([syncFn(), timeoutPromise]);
      } catch (error) {
        // Retornar resultado vazio em caso de timeout
        return { success: true, synced: 0, errors: [] };
      }
    };
    
    // Sincronizar cada tipo de dado
    results.profile = await syncWithTimeout(() => syncUserProfile(userId), 'profile');
    results.freights = await syncWithTimeout(() => syncFreights(userId), 'freights');
    results.quotes = await syncWithTimeout(() => syncQuotes(userId), 'quotes');
    results.notifications = await syncWithTimeout(() => syncNotifications(userId), 'notifications');
    results.messages = await syncWithTimeout(() => syncMessages(userId), 'messages');
    results.socialPosts = await syncWithTimeout(() => syncSocialPosts(userId), 'socialPosts');
    results.transactions = await syncWithTimeout(() => syncTransactions(userId), 'transactions');
    results.ratings = await syncWithTimeout(() => syncRatings(userId), 'ratings');
    results.driverProfile = await syncWithTimeout(() => syncDriverProfile(userId), 'driverProfile');
    results.companyProfile = await syncWithTimeout(() => syncCompanyProfile(userId), 'companyProfile');
    results.preferredRoutes = await syncWithTimeout(() => syncPreferredRoutes(userId), 'preferredRoutes');
    results.activityLogs = await syncWithTimeout(() => syncActivityLogs(userId), 'activityLogs');
    
    // Calcular total sincronizado
    Object.values(results).forEach(result => {
      totalSynced += result.synced;
    });
    
    // Atualizar status
    updateSyncStatus({
      lastSync: new Date().toISOString(),
      pendingSync: false
    });
    
    return {
      success: Object.values(results).every(r => r.success),
      totalSynced,
      results
    };
  } catch (error) {
    // Silenciar erros de sincronização - não são críticos
    updateSyncStatus({ pendingSync: false });
    
    return {
      success: true, // Sistema funciona sem sincronizaão
      totalSynced,
      results
    };
  }
}

/**
 * Carrega TODOS os dados do usuário do Supabase
 */
export async function loadAllUserDataFromSupabase(userId: string): Promise<void> {
  
  try {
    // 1. Carregar perfil
    const user = await loadUserProfileFromSupabase(userId);
    if (user) {
      await database.users.create(user);
    }
    
    // 2. Carregar fretes (COM VERIFICAÇÃO DE DUPLICATAS)
    const freights = await loadFreightsFromSupabase(userId);
    
    let created = 0;
    let skipped = 0;
    
    for (const freight of freights) {
      // ⚠️ VERIFICAR SE JÁ EXISTE ANTES DE CRIAR (evita duplicatas)
      const existing = await database.freights.getById(freight.id);
      
      if (existing.success && existing.data) {
        skipped++;
      } else {
        // ⚠️ CRIAR SEM SINCRONIZAR DE VOLTA PARA O SUPABASE
        // Usar método direto do db-client para evitar loop infinito
        const { db } = await import('./database/db-client');
        const { KeyPatterns } = await import('./database/schema');
        
        // Salvar diretamente no LocalStorage sem acionar sincronização
        await db.set(KeyPatterns.freight(freight.id), freight);
        
        // Adicionar às listas
        const listResponse = await db.get<string[]>(KeyPatterns.freightsList());
        const freightsList = listResponse.data || [];
        if (!freightsList.includes(freight.id)) {
          freightsList.unshift(freight.id);
          await db.set(KeyPatterns.freightsList(), freightsList);
        }
        
        const customerKey = KeyPatterns.freightsByCustomer(freight.customerId);
        const customerResponse = await db.get<string[]>(customerKey);
        const customerFreights = customerResponse.data || [];
        if (!customerFreights.includes(freight.id)) {
          customerFreights.unshift(freight.id);
          await db.set(customerKey, customerFreights);
        }
        
        if (freight.status === 'active') {
          const activeResponse = await db.get<string[]>(KeyPatterns.freightsActive());
          const activeList = activeResponse.data || [];
          if (!activeList.includes(freight.id)) {
            activeList.unshift(freight.id);
            await db.set(KeyPatterns.freightsActive(), activeList);
          }
        }
        
        created++;
      }
    }
    
    // 3. Carregar notificações
    const notifications = await loadNotificationsFromSupabase(userId);
    for (const notification of notifications) {
      await database.notifications.create(notification);
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar dados do Supabase:', error);
  }
}

// ============================================
// AUTO SYNC
// ============================================

let syncInterval: NodeJS.Timeout | null = null;

/** 10 segundos em minutos, usado como padrão de intervalo do auto-sync */
export const AUTO_SYNC_INTERVAL_MINUTES = 10 / 60; // ~0.1667 min = 10 s

/**
 * Inicia sincronização automática em background
 */
export function startAutoSync(userId: string, intervalMinutes: number = AUTO_SYNC_INTERVAL_MINUTES) {
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  
  
  // ✅ Fazer sincronização inicial
  syncAllUserData(userId).then(result => {
  }).catch(error => {
    console.error('❌ Erro na sincronização inicial:', error);
  });
  
  // ✅ Configurar sincronização periódica
  syncInterval = setInterval(() => {
    syncAllUserData(userId).then(result => {
      if (result.totalSynced > 0) {
        // [REVISAR] console.log('✅ Auto-sync:', result.totalSynced, 'item(s) sincronizado(s)');
      }
    }).catch(error => {
      console.error('❌ Erro no auto-sync:', error);
    });
  }, intervalMinutes * 60 * 1000);
  
  updateSyncStatus({ autoSync: true });
}

/**
 * Para sincronização automática
 */
export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

/**
 * Sincroniza ao sair/fechar navegador
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const currentUser = localStorage.getItem('maisfrete:currentUser');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      // Sincronização final antes de sair
      syncAllUserData(user.id);
    }
  });
}