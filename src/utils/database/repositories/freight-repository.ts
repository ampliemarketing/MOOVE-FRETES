/**
 * Freight Repository
 * CRUD operations for Freight entities
 * COM SINCRONIZAÇÃO AUTOMÁTICA SUPABASE
 */

import { db } from '../db-client';
import type { DBResponse } from '../db-client';
import { getSupabaseClient } from '../../supabase/client';
import { Freight, KeyPatterns, FilterParams, PaginationParams } from '../schema';
import { mapLocalStatusToSupabase, mapSupabaseStatusToLocal } from '../../freight-status';
import { logger } from '../../logger';

export class FreightRepository {
  // 🔐 Armazenar userId para operações que precisam de autenticação
  private currentUserId?: string;

  /**
   * Define o userId atual (chamado após login)
   */
  setCurrentUserId(userId: string | undefined) {
    this.currentUserId = userId;
    logger.log('🔐 FreightRepository - userId definido:', userId ? '✅' : '❌');
  }

  /**
   * Create a new freight
   * SALVA DIRETAMENTE NO SUPABASE (LocalStorage é apenas cache)
   */
  async create(freight: Omit<Freight, 'id' | 'createdAt' | 'updatedAt'>, userId?: string): Promise<DBResponse<Freight>> {
    try {
      const now = new Date().toISOString();
      let createdId: string;
      
      const mappedStatus = mapLocalStatusToSupabase(freight.status);
      
      // ✅ LOG DETALHADO
      logger.log('🔄 CREATE - Mapeamento de status:', {
        statusOriginal: freight.status,
        statusMapeado: mappedStatus,
      });
      
      // 🔥 SALVAR NO SUPABASE PRIMEIRO (prioridade) - deixar Supabase gerar o UUID
      try {
        const supabase = getSupabaseClient();
        
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('freights')
          .insert({
            // ❌ NÃO passar ID - deixar Supabase gerar UUID automaticamente
            publisher_id: freight.customerId,
            title: `${freight.cargo.type || freight.weight} - ${freight.origin.city}/${freight.origin.state} → ${freight.destination.city}/${freight.destination.state}`,
            description: freight.observations || freight.cargo.description || '',
            cargo_type: freight.cargo.type || 'Carga geral',
            weight_kg: freight.cargo.weight || 0,
            origin_address: freight.origin.address || '',
            origin_city: freight.origin.city,
            origin_state: freight.origin.state,
            origin_cep: freight.origin.cep || '',
            destination_address: freight.destination.address || '',
            destination_city: freight.destination.city,
            destination_state: freight.destination.state,
            destination_cep: freight.destination.cep || '',
            pickup_date: freight.pickupDate || null,
            delivery_date: freight.deliveryDate || null,
            status: mappedStatus, // ✅ Usar status mapeado
            visibility: freight.status === 'inactive' ? 'private' : 'public',
            vehicle_types: [freight.truckType || freight.vehicleType || 'Truck'],
            views_count: 0,
            created_at: now,
            updated_at: now,
            metadata: {
              customerName: freight.customerName,
              freightType: freight.type,
              exposureLevel: freight.exposureLevel,
              price: freight.price,
              category: freight.category,
              trailerType: freight.trailerType,
              observations: freight.observations,
              originalStatus: freight.status, // ✅ Guardar status original do LocalStorage
              // ✅ CAMPOS ADICIONAIS DO FORMULÁRIO
              product: (freight as any).product,
              species: (freight as any).species,
              cargoType: (freight as any).cargoType,
              occupancyType: (freight as any).occupancyType,
              volumes: (freight as any).volumes,
              volumeUnit: (freight as any).volumeUnit,
              needsCover: (freight as any).needsCover,
              needsTracker: (freight as any).needsTracker,
              isInsured: (freight as any).isInsured,
              cubicWeight: (freight as any).cubicWeight,
              totalCubicMeters: (freight as any).totalCubicMeters,
              length: (freight as any).length,
              width: (freight as any).width,
              height: (freight as any).height,
              selectedLightVehicles: (freight as any).selectedLightVehicles,
              selectedMediumVehicles: (freight as any).selectedMediumVehicles,
              selectedHeavyVehicles: (freight as any).selectedHeavyVehicles,
              selectedClosedTrailers: (freight as any).selectedClosedTrailers,
              selectedOpenTrailers: (freight as any).selectedOpenTrailers,
              selectedSpecialTrailers: (freight as any).selectedSpecialTrailers,
              freightValueType: (freight as any).freightValueType,
              valueCalculation: (freight as any).valueCalculation,
              paymentIncluded: (freight as any).paymentIncluded,
              paymentMethod: (freight as any).paymentMethod,
              advancePayment: (freight as any).advancePayment,
              urgencyType: (freight as any).urgencyType,
              scheduledDate: (freight as any).scheduledDate,
              hasAdditionalCargo: (freight as any).hasAdditionalCargo,
              additionalCargoDetails: (freight as any).additionalCargoDetails,
              responsibleContacts: (freight as any).responsibleContacts || [],
            }
          })
          .select()
          .single();
        
        if (supabaseError) {
          logger.error('❌ Erro ao salvar no Supabase:', supabaseError);
          return {
            success: false,
            error: supabaseError instanceof Error ? supabaseError.message : 'Erro ao salvar frete no Supabase',
          };
        }

        // ✅ Pegar o ID gerado pelo Supabase
        createdId = supabaseData.id;
      } catch (supabaseError) {
        logger.error('❌ Erro inesperado ao salvar no Supabase:', supabaseError);
        return {
          success: false,
          error: supabaseError instanceof Error ? supabaseError.message : 'Erro ao salvar frete no Supabase',
        };
      }

      // 2. CACHEAR NO LOCALSTORAGE (OPCIONAL)
      try {
        const newFreight: Freight = {
          id: createdId,
          ...freight,
          createdAt: now,
          updatedAt: now,
        };
        
        await db.set(KeyPatterns.freight(createdId), newFreight);
        
        // Add to all freights list
        const listResponse = await db.get<string[]>(KeyPatterns.freightsList());
        const freightsList = listResponse.data || [];
        freightsList.unshift(createdId);
        await db.set(KeyPatterns.freightsList(), freightsList);
        
        // Add to customer's freights
        const customerKey = KeyPatterns.freightsByCustomer(freight.customerId);
        const customerResponse = await db.get<string[]>(customerKey);
        const customerFreights = customerResponse.data || [];
        customerFreights.unshift(createdId);
        await db.set(customerKey, customerFreights);
        
        // If active, add to active list
        if (freight.status === 'active') {
          await this.addToActiveList(createdId);
        }
      } catch (cacheError) {
        // Não falhar se o cache não funcionar
        logger.warn('⚠️ Erro ao cachear frete:', cacheError);
      }

      return {
        success: true,
        data: {
          id: createdId,
          ...freight,
          createdAt: now,
          updatedAt: now,
        },
      };
    } catch (error) {
      logger.error('❌ Erro ao criar frete:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create freight',
      };
    }
  }

  /**
   * Get freight by ID
   * BUSCA DO SUPABASE se não encontrar no LocalStorage
   */
  async getById(id: string): Promise<DBResponse<Freight>> {
    // 1. Tentar buscar do LocalStorage primeiro (cache)
    const cacheResponse = await db.get<Freight>(KeyPatterns.freight(id));
    if (cacheResponse.success && cacheResponse.data) {
      return cacheResponse;
    }
    
    // 2. Se não encontrar, buscar do Supabase
    try {
      const supabase = getSupabaseClient();
      const { data: sf, error } = await supabase
        .from('freights')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !sf) {
        return {
          success: false,
          error: 'Freight not found',
        };
      }
      
      // Transformar para formato local
      const freight: Freight = {
        id: sf.id,
        customerId: sf.publisher_id,
        customerName: sf.metadata?.customerName || 'Não informado',
        type: sf.metadata?.freightType || 'regular',
        exposureLevel: sf.metadata?.exposureLevel || 'Média exposição',
        origin: {
          city: sf.origin_city,
          state: sf.origin_state,
          address: sf.origin_address || '',
          cep: sf.origin_cep || '',
        },
        destination: {
          city: sf.destination_city,
          state: sf.destination_state,
          address: sf.destination_address || '',
          cep: sf.destination_cep || '',
        },
        cargo: {
          type: sf.cargo_type || 'Carga geral',
          weight: sf.weight_kg || 0,
          description: sf.description || '',
        },
        weight: `${sf.weight_kg || 0} kg`,
        truckType: sf.vehicle_types?.[0] || 'Truck',
        vehicleType: sf.vehicle_types?.[0] || 'Truck',
        category: sf.metadata?.category || 'Carga Geral',
        trailerType: sf.metadata?.trailerType,
        status: mapSupabaseStatusToLocal(sf.status) as any,
        price: sf.metadata?.price || 'A combinar',
        observations: sf.metadata?.observations || sf.description || '',
        pickupDate: sf.pickup_date,
        deliveryDate: sf.delivery_date,
        views: sf.views_count || 0,
        createdAt: sf.created_at,
        updatedAt: sf.updated_at || sf.created_at,
        responsibleContacts: sf.metadata?.responsibleContacts || [],
      };
      
      // Cachear no LocalStorage para próximas consultas
      await db.set(KeyPatterns.freight(id), freight);
      
      return {
        success: true,
        data: freight,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get freight',
      };
    }
  }

  /**
   * Update freight
   * SINCRONIZA AUTOMATICAMENTE COM SUPABASE
   */
  async update(id: string, updates: Partial<Freight>): Promise<DBResponse<Freight>> {
    try {
      // ✅ LOG DO QUE FOI RECEBIDO
      logger.log('🔍 UPDATE RECEBIDO - Freight ID:', id);
      logger.log('🔍 UPDATE RECEBIDO - Updates completo:', JSON.stringify(updates, null, 2));
      
      // 1. ATUALIZAR NO SUPABASE PRIMEIRO (FONTE PRIMÁRIA)
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const supabaseUpdates: any = {
            updated_at: new Date().toISOString(),
          };
          
          // Mapear campos se existirem no update
          if (updates.status) {
            supabaseUpdates.status = mapLocalStatusToSupabase(updates.status);
            
            // ✅ LOG DETALHADO
            logger.log('📊 MAPEAMENTO DE STATUS:', {
              statusOriginal: updates.status,
              statusMapeado: supabaseUpdates.status,
              todosOsUpdates: Object.keys(supabaseUpdates)
            });
            
            // ✅ Status "inactive" → marcar como privado
            if (updates.status === 'inactive') {
              supabaseUpdates.visibility = 'private';
            } else if (updates.status === 'active' || updates.status === 'open') {
              supabaseUpdates.visibility = 'public';
            } else if (updates.status === 'completed') {
              // ✅ ADICIONADO: Marcar timestamp de conclusão
              supabaseUpdates.completed_at = new Date().toISOString();
            }
          }
          
          if (updates.origin) {
            if (updates.origin.city) supabaseUpdates.origin_city = updates.origin.city;
            if (updates.origin.state) supabaseUpdates.origin_state = updates.origin.state;
            if (updates.origin.address) supabaseUpdates.origin_address = updates.origin.address;
            if (updates.origin.cep) supabaseUpdates.origin_cep = updates.origin.cep;
          }
          
          if (updates.destination) {
            if (updates.destination.city) supabaseUpdates.destination_city = updates.destination.city;
            if (updates.destination.state) supabaseUpdates.destination_state = updates.destination.state;
            if (updates.destination.address) supabaseUpdates.destination_address = updates.destination.address;
            if (updates.destination.cep) supabaseUpdates.destination_cep = updates.destination.cep;
          }
          
          if (updates.cargo) {
            if (typeof updates.cargo === 'object' && 'type' in updates.cargo) {
              supabaseUpdates.cargo_type = updates.cargo.type;
              if (updates.cargo.weight) supabaseUpdates.weight_kg = updates.cargo.weight;
            }
          }
          
          if (updates.pickupDate) supabaseUpdates.pickup_date = updates.pickupDate;
          if (updates.deliveryDate) supabaseUpdates.delivery_date = updates.deliveryDate;
          if (updates.observations) supabaseUpdates.description = updates.observations;
          
          // ✅ LOG COMPLETO ANTES DE ENVIAR
          logger.log('🚀 ENVIANDO UPDATE PARA SUPABASE:', {
            id,
            payload: supabaseUpdates,
            statusFinal: supabaseUpdates.status
          });
          
          const { data: updateData, error: supabaseError } = await supabase
            .from('freights')
            .update(supabaseUpdates)
            .eq('id', id)
            .select();
          
          if (supabaseError) {
            logger.error('❌ Erro ao atualizar frete no Supabase:', supabaseError);
            logger.error('❌ Detalhes do erro RLS:', JSON.stringify(supabaseError, null, 2));
            logger.error('❌ Payload enviado:', JSON.stringify(supabaseUpdates, null, 2));
            logger.error('❌ Freight ID:', id);
            throw supabaseError;
          }
          
          // ✅ VERIFICAR SE O UPDATE REALMENTE AFETOU ALGUMA ROW
          if (!updateData || updateData.length === 0) {
            logger.error('❌ UPDATE não afetou nenhuma row! Possível problema de RLS.');
            logger.error('❌ Freight ID:', id);
            logger.error('❌ Payload enviado:', JSON.stringify(supabaseUpdates, null, 2));
            logger.error('❌ auth.uid() provavelmente diferente do publisher_id');
            throw new Error('Nenhuma row foi atualizada. Verifique as permissões (RLS) no Supabase.');
          }
          
          logger.log('✅ Frete atualizado no Supabase:', id, 'Status:', updateData[0]?.status);
        }
      } catch (supabaseError) {
        logger.error('❌ Erro ao atualizar no Supabase:', supabaseError);
        // ✅ PROPAGAR ERRO para que o chamador saiba que falhou
        return {
          success: false,
          error: supabaseError instanceof Error ? supabaseError.message : 'Erro ao atualizar no Supabase',
        };
      }
      
      // 2. ATUALIZAR NO LOCALSTORAGE (CACHE) SE EXISTIR
      const freightResponse = await this.getById(id);
      if (freightResponse.success && freightResponse.data) {
        const oldFreight = freightResponse.data;
        const updatedFreight: Freight = {
          ...oldFreight,
          ...updates,
          id,
          updatedAt: new Date().toISOString(),
        };

        await db.set(KeyPatterns.freight(id), updatedFreight);

        if (updates.status && updates.status !== oldFreight.status) {
          if (updates.status === 'active') {
            await this.addToActiveList(id);
          } else if (oldFreight.status === 'active') {
            await this.removeFromActiveList(id);
          }
        }

        return {
          success: true,
          data: updatedFreight,
        };
      } else {
        const updatedFreight: any = {
          id,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        
        return {
          success: true,
          data: updatedFreight,
        };
      }
    } catch (error) {
      logger.error('❌ Erro ao atualizar frete:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update freight',
      };
    }
  }

  /**
   * Delete freight
   * SINCRONIZA AUTOMATICAMENTE COM SUPABASE
   * ✅ PRIORIDADE: Deletar do Supabase (fonte primária)
   */
  async delete(id: string): Promise<DBResponse<void>> {
    try {
      // 1. DELETAR DO SUPABASE PRIMEIRO (FONTE PRIMÁRIA)
      try {
        await this.deleteFromSupabase(id);
      } catch (syncError) {
        logger.error('❌ ERRO ao deletar frete do Supabase:', syncError);
        return {
          success: false,
          error: 'Erro ao deletar frete do banco de dados',
        };
      }

      // 2. LIMPAR LOCALSTORAGE (CACHE)
      const freightResponse = await this.getById(id);
      if (freightResponse.success && freightResponse.data) {
        const freight = freightResponse.data;

        const listResponse = await db.get<string[]>(KeyPatterns.freightsList());
        if (listResponse.success && listResponse.data) {
          const updatedList = listResponse.data.filter(fId => fId !== id);
          await db.set(KeyPatterns.freightsList(), updatedList);
        }

        const customerKey = KeyPatterns.freightsByCustomer(freight.customerId);
        const customerResponse = await db.get<string[]>(customerKey);
        if (customerResponse.success && customerResponse.data) {
          const updatedCustomerList = customerResponse.data.filter(fId => fId !== id);
          await db.set(customerKey, updatedCustomerList);
        }

        if (freight.status === 'active') {
          await this.removeFromActiveList(id);
        }

        await db.del(KeyPatterns.freight(id));
      }

      return { success: true };
    } catch (error) {
      logger.error('❌ Erro ao deletar frete:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete freight',
      };
    }
  }

  /**
   * Get all freights with pagination
   * BUSCA DO SUPABASE (fonte primária) e popula LocalStorage (cache)
   */
  async getAll(params?: Partial<PaginationParams & FilterParams>): Promise<DBResponse<Freight[]>> {
    try {
      // 1. BUSCAR DO SUPABASE PRIMEIRO (fonte primária)
      let freights: Freight[] = [];
      
      try {
        const supabase = getSupabaseClient();
        
        const { data: supabaseFreights, error } = await supabase
          .from('freights')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          logger.error('❌ Erro ao buscar do Supabase:', error);
        } else if (supabaseFreights && supabaseFreights.length > 0) {
          // Transformar dados do Supabase para formato local
          freights = supabaseFreights.map(sf => ({
            id: sf.id,
            customerId: sf.publisher_id,
            customerName: sf.metadata?.customerName || 'Não informado',
            type: sf.metadata?.freightType || 'regular',
            exposureLevel: sf.metadata?.exposureLevel || 'Média exposição',
            origin: {
              city: sf.origin_city,
              state: sf.origin_state,
              address: sf.origin_address || '',
              cep: sf.origin_cep || '',
            },
            destination: {
              city: sf.destination_city,
              state: sf.destination_state,
              address: sf.destination_address || '',
              cep: sf.destination_cep || '',
            },
            cargo: {
              type: sf.cargo_type || 'Carga geral',
              weight: sf.weight_kg || 0,
              description: sf.description || '',
            },
            weight: `${sf.weight_kg || 0} kg`,
            truckType: sf.vehicle_types?.[0] || 'Truck',
            vehicleType: sf.vehicle_types?.[0] || 'Truck',
            category: sf.metadata?.category || 'Carga Geral',
            trailerType: sf.metadata?.trailerType,
            status: sf.status === 'open' ? 'active' : 
                    sf.status === 'in_transit' ? 'in-transit' :
                    sf.status === 'delivered' ? 'completed' :
                    sf.status,
            price: sf.metadata?.price || 'A combinar',
            observations: sf.metadata?.observations || sf.description || '',
            pickupDate: sf.pickup_date,
            deliveryDate: sf.delivery_date,
            views: sf.views_count || 0,
            createdAt: sf.created_at,
            updatedAt: sf.updated_at || sf.created_at,
          }));
        }
      } catch (supabaseError) {
        logger.error('❌ Erro ao buscar do Supabase:', supabaseError);
      }
      
      // 2. FALLBACK: Se Supabase falhar, buscar do LocalStorage
      if (freights.length === 0) {
        const listResponse = await db.get<string[]>(KeyPatterns.freightsList());
        const freightIds = listResponse.data || [];

        if (freightIds.length === 0) {
          return {
            success: true,
            data: [],
          };
        }

        for (const id of freightIds) {
          const freightResponse = await this.getById(id);
          if (freightResponse.success && freightResponse.data) {
            freights.push(freightResponse.data);
          }
        }
      }

      // Apply filters
      let filtered = freights;
      
      if (params?.customerId) {
        filtered = filtered.filter(f => f.customerId === params.customerId);
      }

      if (params?.status) {
        filtered = filtered.filter(f => f.status === params.status);
      }

      // Sort by creation date (newest first)
      filtered.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Apply pagination
      const page = params?.page || 1;
      const limit = params?.limit || 1000;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginated = filtered.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginated,
      };
    } catch (error) {
      logger.error('❌ [freight-repository] Erro em getAll():', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get freights',
      };
    }
  }

  /**
   * Get active freights
   */
  async getActive(): Promise<DBResponse<Freight[]>> {
    try {
      const listResponse = await db.get<string[]>(KeyPatterns.freightsActive());
      const activeIds = listResponse.data || [];

      const freights: Freight[] = [];
      for (const id of activeIds) {
        const freightResponse = await this.getById(id);
        if (freightResponse.success && freightResponse.data) {
          freights.push(freightResponse.data);
        }
      }

      return {
        success: true,
        data: freights,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active freights',
      };
    }
  }

  /**
   * Get freights by customer
   */
  async getByCustomer(customerId: string): Promise<DBResponse<Freight[]>> {
    try {
      try {
        const supabase = getSupabaseClient();
        const { data: session } = await supabase.auth.getSession();
        
        if (session?.session) {
          const { data: supabaseFreights, error } = await supabase
            .from('freights')
            .select('*')
            .eq('publisher_id', customerId)
            .order('created_at', { ascending: false });
          
          if (error) {
            logger.error('❌ Erro ao buscar do Supabase:', error);
          } else if (supabaseFreights && supabaseFreights.length > 0) {
            const freights = supabaseFreights.map(sf => this.transformSupabaseFreight(sf));
            
            return {
              success: true,
              data: freights,
            };
          }
        }
      } catch (supabaseError) {
        logger.error('❌ Erro ao buscar do Supabase:', supabaseError);
      }
      
      const customerKey = KeyPatterns.freightsByCustomer(customerId);
      const listResponse = await db.get<string[]>(customerKey);
      const freightIds = listResponse.data || [];

      const freights: Freight[] = [];
      for (const id of freightIds) {
        const freightResponse = await this.getById(id);
        if (freightResponse.success && freightResponse.data) {
          freights.push(freightResponse.data);
        }
      }
      
      return {
        success: true,
        data: freights,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get customer freights',
      };
    }
  }

  /**
   * Increment views counter
   */
  async incrementViews(id: string): Promise<DBResponse<void>> {
    try {
      const freightResponse = await this.getById(id);
      if (!freightResponse.success || !freightResponse.data) {
        return {
          success: false,
          error: 'Freight not found',
        };
      }

      const freight = freightResponse.data;
      const updatedFreight = {
        ...freight,
        views: (freight.views || 0) + 1,
        updatedAt: new Date().toISOString(),
      };

      await db.set(KeyPatterns.freight(id), updatedFreight);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to increment views',
      };
    }
  }

  /**
   * Increment quotes counter
   */
  async incrementQuotes(id: string): Promise<DBResponse<void>> {
    try {
      const freightResponse = await this.getById(id);
      if (!freightResponse.success || !freightResponse.data) {
        return {
          success: false,
          error: 'Freight not found',
        };
      }

      const freight = freightResponse.data;
      const updatedFreight = {
        ...freight,
        quotesCount: (freight.quotesCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      };

      await db.set(KeyPatterns.freight(id), updatedFreight);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to increment quotes',
      };
    }
  }

  private async addToActiveList(id: string): Promise<void> {
    const listResponse = await db.get<string[]>(KeyPatterns.freightsActive());
    const activeList = listResponse.data || [];
    
    if (!activeList.includes(id)) {
      activeList.unshift(id);
      await db.set(KeyPatterns.freightsActive(), activeList);
    }
  }

  private async removeFromActiveList(id: string): Promise<void> {
    const listResponse = await db.get<string[]>(KeyPatterns.freightsActive());
    if (listResponse.success && listResponse.data) {
      const updatedList = listResponse.data.filter(fId => fId !== id);
      await db.set(KeyPatterns.freightsActive(), updatedList);
    }
  }

  /**
   * 🔄 SINCRONIZAÇÃO COM SUPABASE
   * Salva o frete na tabela 'freights' do Supabase Database
   * ✅ NÃO BLOQUEIA se não houver sessão - apenas registra warning
   */
  private async syncToSupabase(freight: Freight): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // 🔐 Tentar pegar sessão - mas NÃO bloquear se não houver
      const { data: { session } } = await supabase.auth.getSession();
      
      // 🔐 Usar currentUserId se disponível, ou userId da sessão
      const userId = this.currentUserId || session?.user?.id;
      
      if (!userId) {
        logger.warn('⚠️ Sincronização com Supabase ignorada - nenhum userId disponível');
        logger.warn('💡 Dados salvos localmente. Farão sync quando houver autenticação.');
        return;
      }

      const statusMap: Record<string, string> = {
        'active': 'open',
        'in_transit': 'in_transit',
        'in-transit': 'in_transit',
        'completed': 'delivered',
        'cancelled': 'cancelled',
        'draft': 'open',
      };

      const supabaseData = {
        id: freight.id,
        publisher_id: userId, // ✅ Usa userId local ou da sessão
        title: `Frete ${freight.origin.city} → ${freight.destination.city}`,
        description: freight.cargoDescription || freight.cargo || 'Sem descrição',
        cargo_type: freight.cargoType || freight.cargo || 'Carga geral',
        weight_kg: freight.weight ? this.parseWeight(freight.weight) : null,
        origin_address: freight.origin.address || '',
        origin_city: freight.origin.city,
        origin_state: freight.origin.state,
        destination_address: freight.destination.address || '',
        destination_city: freight.destination.city,
        destination_state: freight.destination.state,
        pickup_date: freight.pickupDate || null,
        delivery_date: freight.deliveryDate || null,
        status: mappedStatus, // ✅ Usar status mapeado
        visibility: 'public',
        vehicle_types: freight.truckType ? [freight.truckType] : [],
        is_urgent: freight.urgent || false,
        views_count: freight.views || 0,
        quotes_count: freight.quotesCount || 0,
        metadata: {
          originalStatus: freight.status,
          customerName: freight.customerName,
          price: freight.price,
          distance: freight.distance,
          vehicleType: freight.vehicleType,
          freightType: freight.type,
          category: freight.category,
          truckType: freight.truckType,
          observations: freight.observations,
          localStorageCustomerId: freight.customerId,
        },
        created_at: freight.createdAt,
        updated_at: freight.updatedAt,
      };
      
      // ✅ LOG COMPLETO DO PAYLOAD
      logger.log('🚀 SYNC TO SUPABASE - Payload completo:', {
        id: supabaseData.id,
        status: supabaseData.status,
        payloadCompleto: supabaseData
      });

      const { data, error } = await supabase
        .from('freights')
        .upsert(supabaseData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        logger.error('❌ Erro do Supabase ao sincronizar frete:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      logger.log('✅ Frete sincronizado com Supabase:', freight.id);
    } catch (error) {
      logger.error('❌ Erro na sincronização com Supabase:', error);
      // ⚠️ NÃO throw - apenas registra o erro mas continua a operação local
      logger.warn('💾 Dados salvos apenas localmente. Sincronização pendente.');
    }
  }

  /**
   * 🗑️ DELETAR DO SUPABASE
   * ✅ NÃO BLOQUEIA se não houver sessão
   */
  private async deleteFromSupabase(id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // 🔐 Tentar pegar sessão - mas NÃO bloquear se não houver
      const { data: { session } } = await supabase.auth.getSession();
      
      // 🔐 Usar currentUserId se disponível, ou userId da sessão
      const userId = this.currentUserId || session?.user?.id;
      
      if (!userId) {
        logger.warn('⚠️ Deleção do Supabase ignorada - nenhum userId disponível');
        logger.warn('💡 Dados deletados apenas localmente.');
        return;
      }

      const { error } = await supabase
        .from('freights')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('❌ Erro ao deletar frete do Supabase:', error);
        throw error;
      }
      
      logger.log('✅ Frete deletado do Supabase:', id);
    } catch (error) {
      logger.error('❌ Erro ao deletar do Supabase:', error);
      // ⚠️ NÃO throw - apenas registra o erro
      logger.warn('💾 Dados deletados apenas localmente.');
    }
  }

  /**
   * Helper para converter peso em kg
   */
  private parseWeight(weight: string): number | null {
    try {
      const cleaned = weight.replace(/[^\\d,.]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    } catch {
      return null;
    }
  }

  /**
   * Helper para verificar duplicatas recentes
   */
  private async checkRecentDuplicate(freight: Omit<Freight, 'id' | 'createdAt' | 'updatedAt'>): Promise<Freight | null> {
    const hasEmptyFields = !freight.origin.city || !freight.origin.state || 
                          !freight.destination.city || !freight.destination.state;
    
    if (hasEmptyFields) {
      return null;
    }

    const listResponse = await db.get<string[]>(KeyPatterns.freightsList());
    const freightIds = listResponse.data || [];

    const recentFreights: Freight[] = [];
    for (const id of freightIds.slice(0, 10)) {
      const freightResponse = await this.getById(id);
      if (freightResponse.success && freightResponse.data) {
        const createdAt = new Date(freightResponse.data.createdAt);
        const now = new Date();
        const diffSeconds = (now.getTime() - createdAt.getTime()) / 1000;
        if (diffSeconds < 2) {
          recentFreights.push(freightResponse.data);
        }
      }
    }

    for (const recentFreight of recentFreights) {
      const isSameOrigin = recentFreight.origin.city === freight.origin.city &&
                          recentFreight.origin.state === freight.origin.state;
      const isSameDestination = recentFreight.destination.city === freight.destination.city &&
                               recentFreight.destination.state === freight.destination.state;
      const isSameCargo = recentFreight.cargo === freight.cargo;
      const isSameCustomer = recentFreight.customerId === freight.customerId;
      const isSameStatus = recentFreight.status === freight.status;
      const isSameWeight = recentFreight.weight === freight.weight;
      const isSamePrice = recentFreight.price === freight.price;
      
      if (isSameOrigin && isSameDestination && isSameCargo && isSameCustomer && 
          isSameStatus && isSameWeight && isSamePrice) {
        return recentFreight;
      }
    }

    return null;
  }

  /**
   * Helper para transformar dados do Supabase para formato local
   */
  private transformSupabaseFreight(sf: any): Freight {
    return {
      id: sf.id,
      customerId: sf.publisher_id,
      customerName: sf.metadata?.customerName || 'Não informado',
      publisherPhone: sf.profiles?.phone,
      type: sf.metadata?.freightType || 'regular',
      exposureLevel: sf.metadata?.exposureLevel || 'Média exposição',
      origin: {
        city: sf.origin_city,
        state: sf.origin_state,
        address: sf.origin_address || '',
        cep: sf.origin_cep || '',
      },
      destination: {
        city: sf.destination_city,
        state: sf.destination_state,
        address: sf.destination_address || '',
        cep: sf.destination_cep || '',
      },
      cargo: {
        type: sf.cargo_type || 'Carga geral',
        weight: sf.weight_kg || 0,
        description: sf.description || '',
      },
      weight: `${sf.weight_kg || 0} kg`,
      truckType: sf.vehicle_types?.[0] || 'Truck',
      vehicleType: sf.vehicle_types?.[0] || 'Truck',
      category: sf.metadata?.category || 'Carga Geral',
      trailerType: sf.metadata?.trailerType,
      status: sf.status === 'open' ? 'active' : 
              sf.status === 'in_transit' ? 'in-transit' :
              sf.status === 'delivered' ? 'completed' :
              sf.status,
      price: sf.metadata?.price || 'A combinar',
      observations: sf.metadata?.observations || sf.description || '',
      pickupDate: sf.pickup_date,
      deliveryDate: sf.delivery_date,
      views: sf.views_count || 0,
      quotesCount: sf.quotes_count || 0,
      createdAt: sf.created_at,
      updatedAt: sf.updated_at || sf.created_at,
      responsibleContacts: sf.metadata?.responsibleContacts || [],
    };
  }
}

export const freightRepository = new FreightRepository();