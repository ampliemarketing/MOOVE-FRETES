/**
 * Database Client - LocalStorage Implementation
 */

import type { DBResponse } from './schema';
import { logger } from '../logger';

export class DatabaseClient {
  constructor() {
    // Log do modo ativo
    if (typeof window !== 'undefined') {
      logger.info('DatabaseClient', '🟢 MODO LOCALSTORAGE (Padrão)');
      logger.info('DatabaseClient', 'Dados sincronizados com Supabase em background automaticamente');
    }
  }

  /**
   * Get a single value by key
   */
  async get<T>(key: string): Promise<DBResponse<T>> {
    try {
      const stored = localStorage.getItem(`maisfrete:${key}`);
      if (stored) {
        return {
          success: true,
          data: JSON.parse(stored) as T,
        };
      }
      return {
        success: false,
        error: 'Key not found',
      };
    } catch (error) {
      logger.error('DatabaseClient.get', 'Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Set a single value
   */
  async set<T>(key: string, value: T): Promise<DBResponse<void>> {
    try {
      localStorage.setItem(`maisfrete:${key}`, JSON.stringify(value));
      return { success: true };
    } catch (error) {
      logger.error('DatabaseClient.set', 'Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a single key
   */
  async del(key: string): Promise<DBResponse<void>> {
    try {
      localStorage.removeItem(`maisfrete:${key}`);
      return { success: true };
    } catch (error) {
      logger.error('DatabaseClient.del', 'Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get multiple values by keys
   */
  async mget<T>(keys: string[]): Promise<DBResponse<T[]>> {
    try {
      const results = await Promise.all(keys.map(key => this.getMockData<T>(key)));
      return {
        success: true,
        data: results.filter(r => r.success).map(r => r.data!),
      };
    } catch (error) {
      logger.error('DatabaseClient.mget', 'Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Set multiple values
   */
  async mset<T>(entries: Array<{ key: string; value: T }>): Promise<DBResponse<void>> {
    try {
      await Promise.all(entries.map(({ key, value }) => this.setMockData(key, value)));
      return { success: true };
    } catch (error) {
      logger.error('DatabaseClient.mset', 'Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete multiple keys
   */
  async mdel(keys: string[]): Promise<DBResponse<void>> {
    try {
      await Promise.all(keys.map(key => this.deleteMockData(key)));
      return { success: true };
    } catch (error) {
      logger.error('DatabaseClient.mdel', 'Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all keys matching a prefix
   */
  async getByPrefix<T>(prefix: string): Promise<DBResponse<Record<string, T>>> {
    try {
      const results: Record<string, T> = {};
      const prefixKey = `maisfrete:${prefix}`;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefixKey)) {
          const value = localStorage.getItem(key);
          if (value) {
            results[key.replace('maisfrete:', '')] = JSON.parse(value) as T;
          }
        }
      }
      
      return {
        success: true,
        data: results,
      };
    } catch (error) {
      logger.error('DatabaseClient.getByPrefix', 'Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Increment a counter
   */
  async increment(key: string, amount: number = 1): Promise<DBResponse<number>> {
    try {
      const current = await this.getMockData<number>(key);
      const newValue = (current.data || 0) + amount;
      await this.setMockData(key, newValue);
      return { success: true, data: newValue };
    } catch (error) {
      logger.error('DatabaseClient.increment', 'Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Insert a document into a collection (table)
   */
  async insert<T extends { id: string }>(tableName: string, data: T): Promise<DBResponse<T>> {
    const key = `${tableName}:${data.id}`;
    const result = await this.set(key, data);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data,
    };
  }

  /**
   * Query documents from a collection with filters
   */
  async query<T>(
    pattern: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: keyof T;
      sortOrder?: 'asc' | 'desc';
      filter?: (item: T) => boolean;
    }
  ): Promise<DBResponse<T[]>> {
    try {
      // Get all items from this table
      const result = await this.getByPrefix<T>(`${pattern}:`);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Query failed',
        };
      }

      // If no data, return empty array (not an error)
      if (!result.data || Object.keys(result.data).length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      let items = Object.values(result.data);

      // Apply filter
      if (options?.filter) {
        items = items.filter(options.filter);
      }

      // Apply ordering
      if (options?.sortBy) {
        const { sortBy, sortOrder } = options;
        items.sort((a, b) => {
          const aVal = (a as any)[sortBy];
          const bVal = (b as any)[sortBy];
          
          if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }

      // Apply limit and offset
      if (options?.limit || options?.offset) {
        const { limit, offset } = options;
        items = items.slice(offset || 0, limit ? (offset || 0) + limit : undefined);
      }

      return {
        success: true,
        data: items,
      };
    } catch (error) {
      logger.error('DatabaseClient.query', 'Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================
  // MOCK DATA METHODS (Demo Mode)
  // ============================================

  private async getMockData<T>(key: string): Promise<DBResponse<T>> {
    try {
      const stored = localStorage.getItem(`maisfrete:${key}`);
      if (stored) {
        return {
          success: true,
          data: JSON.parse(stored) as T,
        };
      }
      return {
        success: false,
        error: 'Key not found',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async setMockData<T>(key: string, value: T): Promise<DBResponse<void>> {
    try {
      localStorage.setItem(`maisfrete:${key}`, JSON.stringify(value));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async deleteMockData(key: string): Promise<DBResponse<void>> {
    try {
      localStorage.removeItem(`maisfrete:${key}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
export const db = new DatabaseClient();