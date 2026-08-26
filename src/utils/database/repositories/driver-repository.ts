/**
 * Driver Repository
 * CRUD operations for Driver entities
 * ✅ TOTALMENTE INTEGRADO COM SUPABASE
 */

import { db, DBResponse } from '../db-client';
import { Driver, KeyPatterns, PaginationParams } from '../schema';
import { getSupabaseClient } from '../../supabase/client';
import { driverToSQL, sqlToDriver } from '../adapters';
import { generateId } from '../id-generator';

export class DriverRepository {
  /**
   * Create a new driver
   * ✅ SALVA NO SUPABASE PRIMEIRO (fonte primária)
   */
  async create(driver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>): Promise<DBResponse<Driver>> {
    try {
      const now = new Date().toISOString();
      let createdId: string;

      // 🔥 1. SALVAR NO SUPABASE PRIMEIRO (prioridade) - deixar Supabase gerar UUID
      try {
        const supabase = getSupabaseClient();

        // ✅ Usa o mesmo adapter que update() já usava — o insert manual
        // anterior só gravava um subconjunto de colunas (faltavam name,
        // phone, rg, birth_date, rntrc, vehicle_model/year, renavam,
        // antt_vehicle, vehicle_types, body_types, address...) e lia
        // `driver.available` em vez de `driver.status`, então todo motorista
        // cadastrado ficava com available=false e a maioria dos campos vazia.
        const sqlPayload = driverToSQL({ ...driver, id: '', createdAt: now, updatedAt: now } as Driver);
        delete (sqlPayload as any).id;

        const { data: supabaseData, error: supabaseError } = await supabase
          .from('drivers')
          .insert(sqlPayload)
          .select()
          .single();
        
        if (supabaseError) {
          console.error('❌ Erro ao salvar motorista no Supabase:', supabaseError);
          throw supabaseError;
        }
        
        // ✅ Pegar o ID gerado pelo Supabase
        createdId = supabaseData.id;
        
      } catch (supabaseError) {
        console.error('❌ ERRO CRÍTICO ao salvar motorista no Supabase:', supabaseError);
        throw new Error('Erro ao salvar motorista: ' + (supabaseError instanceof Error ? supabaseError.message : 'Unknown'));
      }

      // 2. CACHEAR NO LOCALSTORAGE (opcional, para performance)
      const newDriver: Driver = {
        ...driver,
        id: createdId,
        createdAt: now,
        updatedAt: now,
      };
      
      try {
        await db.set(KeyPatterns.driver(createdId), newDriver);
        await db.set(KeyPatterns.driverByUserId(driver.userId), createdId);
        
        const listResponse = await db.get<string[]>(KeyPatterns.driversList());
        const driversList = listResponse.data || [];
        driversList.push(createdId);
        await db.set(KeyPatterns.driversList(), driversList);
      } catch (cacheError) {
        // [REVISAR] console.warn('⚠️ Erro ao cachear motorista (não crítico):', cacheError);
      }

      return {
        success: true,
        data: newDriver,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create driver',
      };
    }
  }

  /**
   * Get driver by ID
   * ✅ BUSCA DO SUPABASE se não estiver em cache
   */
  async getById(id: string): Promise<DBResponse<Driver>> {
    // 1. Tentar cache primeiro (performance)
    const cacheResponse = await db.get<Driver>(KeyPatterns.driver(id));
    if (cacheResponse.success && cacheResponse.data) {
      return cacheResponse;
    }
    
    // 2. Buscar do Supabase
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // ✅ Fix: Usar maybeSingle() para evitar erro com duplicatas
      
      if (error || !data) {
        return {
          success: false,
          error: 'Driver not found',
        };
      }
      
      const driver = sqlToDriver(data);
      
      // Cachear para próxima vez
      await db.set(KeyPatterns.driver(id), driver);
      
      return {
        success: true,
        data: driver,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get driver',
      };
    }
  }

  /**
   * Get driver by user ID
   * ✅ BUSCA DO SUPABASE
   */
  async getByUserId(userId: string): Promise<DBResponse<Driver>> {
    // 1. Tentar cache primeiro
    const idResponse = await db.get<string>(KeyPatterns.driverByUserId(userId));
    if (idResponse.success && idResponse.data) {
      return await this.getById(idResponse.data);
    }
    
    // 2. Buscar do Supabase
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // ✅ Fix: Usar maybeSingle() para evitar erro com duplicatas
      
      if (error || !data) {
        return {
          success: false,
          error: 'Driver not found',
        };
      }
      
      const driver = sqlToDriver(data);
      
      // Cachear
      await db.set(KeyPatterns.driver(driver.id), driver);
      await db.set(KeyPatterns.driverByUserId(userId), driver.id);
      
      return {
        success: true,
        data: driver,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get driver',
      };
    }
  }

  /**
   * Update driver
   * ✅ ATUALIZA NO SUPABASE
   */
  async update(id: string, updates: Partial<Driver>): Promise<DBResponse<Driver>> {
    try {
      const driverResponse = await this.getById(id);
      if (!driverResponse.success || !driverResponse.data) {
        return {
          success: false,
          error: 'Driver not found',
        };
      }

      const oldDriver = driverResponse.data;
      const updatedDriver: Driver = {
        ...oldDriver,
        ...updates,
        id, // Preserve ID
        updatedAt: new Date().toISOString(),
      };

      // 🔥 1. ATUALIZAR NO SUPABASE
      try {
        const supabase = getSupabaseClient();
        const sqlData = driverToSQL(updatedDriver);
        
        const { error: supabaseError } = await supabase
          .from('drivers')
          .update(sqlData)
          .eq('id', id);
        
        if (supabaseError) {
          console.error('❌ Erro ao atualizar motorista no Supabase:', supabaseError);
          throw supabaseError;
        }
      } catch (supabaseError) {
        console.error('❌ ERRO ao atualizar motorista no Supabase:', supabaseError);
        // Continua mesmo com erro no Supabase (atualiza cache)
      }

      // 2. ATUALIZAR CACHE
      await db.set(KeyPatterns.driver(id), updatedDriver);

      return {
        success: true,
        data: updatedDriver,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update driver',
      };
    }
  }

  /**
   * Delete driver
   * ✅ DELETE DO SUPABASE
   */
  async delete(id: string): Promise<DBResponse<void>> {
    try {
      const driverResponse = await this.getById(id);
      if (!driverResponse.success || !driverResponse.data) {
        return {
          success: false,
          error: 'Driver not found',
        };
      }

      const driver = driverResponse.data;

      // 🔥 1. DELETE DO SUPABASE
      try {
        const supabase = getSupabaseClient();
        
        const { error: supabaseError } = await supabase
          .from('drivers')
          .delete()
          .eq('id', id);
        
        if (supabaseError) {
          console.error('❌ Erro ao deletar motorista no Supabase:', supabaseError);
          throw supabaseError;
        }
      } catch (supabaseError) {
        console.error('❌ ERRO ao deletar motorista:', supabaseError);
      }

      // 2. LIMPAR CACHE
      await db.delete(KeyPatterns.driverByUserId(driver.userId));
      
      const listResponse = await db.get<string[]>(KeyPatterns.driversList());
      if (listResponse.success && listResponse.data) {
        const updatedList = listResponse.data.filter(dId => dId !== id);
        await db.set(KeyPatterns.driversList(), updatedList);
      }
      
      await db.delete(KeyPatterns.driver(id));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete driver',
      };
    }
  }

  /**
   * Get all drivers
   * ✅ BUSCA DO SUPABASE COM CACHE
   */
  async getAll(pagination?: PaginationParams): Promise<DBResponse<Driver[]>> {
    try {
      const supabase = getSupabaseClient();
      
      let query = supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Apply pagination
      if (pagination) {
        const { page = 1, limit = 20 } = pagination;
        const start = (page - 1) * limit;
        query = query.range(start, start + limit - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Erro ao buscar motoristas:', error);
        
        // Fallback para cache
        const listResponse = await db.get<string[]>(KeyPatterns.driversList());
        if (!listResponse.success || !listResponse.data) {
          return { success: true, data: [] };
        }
        
        let driverIds = listResponse.data;
        if (pagination) {
          const { page = 1, limit = 20 } = pagination;
          const start = (page - 1) * limit;
          const end = start + limit;
          driverIds = driverIds.slice(start, end);
        }
        
        const driversResponse = await db.mget<Driver>(
          driverIds.map(id => KeyPatterns.driver(id))
        );
        
        return {
          success: true,
          data: driversResponse.data || [],
        };
      }
      
      const drivers = data.map(sqlToDriver);
      
      // Cachear motoristas
      for (const driver of drivers) {
        await db.set(KeyPatterns.driver(driver.id), driver);
      }
      
      return {
        success: true,
        data: drivers,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get drivers',
      };
    }
  }

  /**
   * Update driver location
   */
  async updateLocation(id: string, location: Driver['currentLocation']): Promise<DBResponse<Driver>> {
    return await this.update(id, {
      currentLocation: location,
    });
  }

  /**
   * Update driver status
   */
  async updateStatus(id: string, status: Driver['status']): Promise<DBResponse<Driver>> {
    return await this.update(id, { status });
  }

  /**
   * Complete trip (increment stats)
   */
  async completeTrip(id: string): Promise<DBResponse<Driver>> {
    try {
      const driverResponse = await this.getById(id);
      if (!driverResponse.success || !driverResponse.data) {
        return {
          success: false,
          error: 'Driver not found',
        };
      }

      const driver = driverResponse.data;
      return await this.update(id, {
        completedTrips: driver.completedTrips + 1,
        totalTrips: driver.totalTrips + 1,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete trip',
      };
    }
  }

  /**
   * Update driver rating
   */
  async updateRating(id: string, newRating: number): Promise<DBResponse<Driver>> {
    try {
      const driverResponse = await this.getById(id);
      if (!driverResponse.success || !driverResponse.data) {
        return {
          success: false,
          error: 'Driver not found',
        };
      }

      const driver = driverResponse.data;
      const currentRating = driver.rating;
      const totalTrips = driver.totalTrips;
      
      // Calculate new average rating
      const updatedRating = ((currentRating * totalTrips) + newRating) / (totalTrips + 1);

      return await this.update(id, {
        rating: Math.round(updatedRating * 10) / 10, // Round to 1 decimal
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update rating',
      };
    }
  }

  /**
   * Get available drivers by location (availability within 24h)
   * ✅ BUSCA DO SUPABASE
   */
  async getAvailableByLocation(city: string, state: string): Promise<DBResponse<Driver[]>> {
    try {
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();
      
      // ✅ CORRIGIDO: Buscar drivers SEM JOIN para evitar ambiguidade de colunas
      const { data: driversData, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('available', true)
        .gt('availability_expires_at', now) // Não expirado
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar motoristas disponíveis:', error);
        return { success: true, data: [] };
      }
      
      // Buscar profiles separadamente
      const userIds = (driversData || []).map(d => d.user_id);
      let profilesData: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email, phone, avatar_url, rating')
          .in('id', userIds);
        profilesData = profiles || [];
      }
      
      // Criar map de perfis
      const profilesMap = new Map();
      profilesData.forEach(p => profilesMap.set(p.id, p));
      
      // Merge manual
      const data = (driversData || []).map((d: any) => {
        const profile = profilesMap.get(d.user_id);
        return {
          ...d,
          profiles: profile || null
        };
      });
      
      
      // Converter e filtrar por localização (case-insensitive e trim)
      const drivers = data
        .map(sqlToDriver)
        .filter(driver => {
          if (!driver.currentLocation) {
            return false;
          }
          
          // Normalizar strings para comparação (case-insensitive, sem espaços extras)
          const driverCity = (driver.currentLocation.city || '').toLowerCase().trim();
          const driverState = (driver.currentLocation.state || '').toLowerCase().trim();
          const searchCity = (city || '').toLowerCase().trim();
          const searchState = (state || '').toLowerCase().trim();
          
          const matches = driverCity === searchCity && driverState === searchState;
          
          return matches;
        });
      
      
      return {
        success: true,
        data: drivers,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get available drivers',
      };
    }
  }

  /**
   * Get available drivers by location WITH PROFILES (para UI)
   * Retorna dados RAW do Supabase incluindo profiles
   * ✅ BUSCA DO SUPABASE
   */
  async getAvailableByLocationWithProfiles(city: string, state: string): Promise<DBResponse<any[]>> {
    try {
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();
      
      // 🔥 PASSO 1: Buscar motoristas disponíveis
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('*')
        .eq('available', true)
        .gt('availability_expires_at', now) // Não expirado
        .order('rating', { ascending: false });
      
      if (driversError) {
        console.error('❌ Erro ao buscar motoristas disponíveis:', driversError);
        return { success: true, data: [] };
      }
      
      
      // Filtrar por localização (case-insensitive e trim)
      const filteredDrivers = driversData.filter(driver => {
        if (!driver.current_location) {
          return false;
        }
        
        // Normalizar strings para comparação (case-insensitive, sem espaços extras)
        const driverCity = (driver.current_location.city || '').toLowerCase().trim();
        const driverState = (driver.current_location.state || '').toLowerCase().trim();
        const searchCity = (city || '').toLowerCase().trim();
        const searchState = (state || '').toLowerCase().trim();
        
        const matches = driverCity === searchCity && driverState === searchState;
        
        return matches;
      });
      
      
      if (filteredDrivers.length === 0) {
        return { success: true, data: [] };
      }
      
      // 🔥 PASSO 2: Buscar profiles correspondentes
      const userIds = filteredDrivers.map(d => d.user_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profilesError) {
        console.error('⚠️ Erro ao buscar profiles (não crítico):', profilesError);
        // Retornar drivers mesmo sem profiles
        return { success: true, data: filteredDrivers };
      }
      
      
      // 🔥 PASSO 3: Combinar drivers com profiles
      const driversWithProfiles = filteredDrivers.map(driver => {
        const profile = profilesData?.find(p => p.id === driver.user_id);
        return {
          ...driver,
          profile: profile || null,
        };
      });
      
      
      return {
        success: true,
        data: driversWithProfiles,
      };
    } catch (error) {
      console.error('❌ [getAvailableByLocationWithProfiles] Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get available drivers',
      };
    }
  }

  /**
   * Get driver availability status
   * ✅ BUSCA DO SUPABASE
   */
  async getDriverAvailability(userId: string): Promise<{
    isAvailable: boolean;
    location: { city: string; state: string } | null;
    expiresAt: string | null;
  } | null> {
    try {
      const driverResponse = await this.getByUserId(userId);
      if (!driverResponse.success || !driverResponse.data) {
        return null;
      }

      const driver = driverResponse.data;
      return {
        isAvailable: driver.available ?? false,
        location: driver.currentLocation || null,
        expiresAt: driver.availabilityExpiresAt || null,
      };
    } catch (error) {
      console.error('❌ Erro ao buscar disponibilidade:', error);
      return null;
    }
  }

  /**
   * Update driver availability
   * ✅ ATUALIZA NO SUPABASE (cria o motorista se não existir)
   */
  async updateDriverAvailability(
    userId: string,
    updates: {
      isAvailable: boolean;
      location: { city: string; state: string } | null;
      expiresAt: string | null;
    }
  ): Promise<DBResponse<boolean>> {
    try {
      let driverResponse = await this.getByUserId(userId);
      
      // 🔥 Se motorista não existir, criar automaticamente
      if (!driverResponse.success || !driverResponse.data) {
        
        const createResponse = await this.create({
          userId: userId,
          cnh: 'CNH-PENDENTE', // Placeholder até completar cadastro
          cnhCategory: 'B',
          available: updates.isAvailable,
          currentLocation: updates.location || null,
          availabilityExpiresAt: updates.expiresAt,
        });
        
        if (!createResponse.success || !createResponse.data) {
          return {
            success: false,
            error: 'Erro ao criar motorista: ' + createResponse.error,
          };
        }
        
        
        // Usar o motorista recém-criado
        driverResponse = {
          success: true,
          data: createResponse.data,
        };
      }

      const driver = driverResponse.data!;
      
      
      const updateResult = await this.update(driver.id, {
        available: updates.isAvailable,
        currentLocation: updates.location,
        availabilityExpiresAt: updates.expiresAt,
      });

      return {
        success: updateResult.success,
        data: updateResult.success,
        error: updateResult.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update availability',
      };
    }
  }
}

export const driverRepository = new DriverRepository();