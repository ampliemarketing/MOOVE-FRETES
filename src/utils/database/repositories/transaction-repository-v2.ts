/**
 * Transaction Repository - 100% Integrado com Supabase
 * Seguindo padrão do DriverRepository e NotificationRepository
 * 
 * ARQUITETURA:
 * 1. Supabase como fonte primária
 * 2. LocalStorage como cache opcional
 * 3. Adapters para conversão de dados
 */

import { getSupabaseClient } from '../../supabase/client';
import { db, DBResponse } from '../db-client';
import { Transaction, KeyPatterns, PaginationParams } from '../schema';
import { transactionToSQL, sqlToTransaction } from '../adapters';
import { generateId } from '../id-generator';

export class TransactionRepository {
  /**
   * Create a new transaction
   * ✅ SALVA NO SUPABASE PRIMEIRO, depois cacheia
   */
  async create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<DBResponse<Transaction>> {
    try {
      const now = new Date().toISOString();
      
      // 1. SALVAR NO SUPABASE (fonte primária) - deixar Supabase gerar UUID
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          // ❌ NÃO passar ID - deixar Supabase gerar UUID automaticamente
          payer_id: transaction.payerId,
          receiver_id: transaction.receiverId,
          freight_id: transaction.freightId || null,
          amount: transaction.amount,
          type: transaction.type,
          status: transaction.status || 'pending',
          payment_method: transaction.paymentMethod || null,
          description: transaction.description || null,
          created_at: now,
          metadata: transaction.metadata || {},
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar transação no Supabase:', error);
        throw error;
      }

      const created = sqlToTransaction(data);
      console.log('✅ Transação criada no Supabase:', created.id);

      // 2. CACHEAR NO LOCALSTORAGE (opcional)
      try {
        await db.set(KeyPatterns.transaction(created.id), created);
        
        // Index by payer
        const payerKey = KeyPatterns.transactionsByUser(transaction.payerId);
        const payerResponse = await db.get<string[]>(payerKey);
        const payerTransactions = payerResponse.data || [];
        payerTransactions.unshift(created.id);
        await db.set(payerKey, payerTransactions);

        // Index by receiver
        const receiverKey = KeyPatterns.transactionsByUser(transaction.receiverId);
        const receiverResponse = await db.get<string[]>(receiverKey);
        const receiverTransactions = receiverResponse.data || [];
        receiverTransactions.unshift(created.id);
        await db.set(receiverKey, receiverTransactions);

        // Index by freight if exists
        if (transaction.freightId) {
          const freightKey = KeyPatterns.transactionsByFreight(transaction.freightId);
          const freightResponse = await db.get<string[]>(freightKey);
          const freightTransactions = freightResponse.data || [];
          freightTransactions.unshift(created.id);
          await db.set(freightKey, freightTransactions);
        }
      } catch (cacheError) {
        console.warn('⚠️ Erro ao cachear transação:', cacheError);
      }

      return {
        success: true,
        data: created,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create transaction',
      };
    }
  }

  /**
   * Get transaction by ID
   * ✅ Busca no cache primeiro, depois Supabase
   */
  async getById(id: string): Promise<DBResponse<Transaction>> {
    try {
      // 1. Tentar cache local
      const cacheResponse = await db.get<Transaction>(KeyPatterns.transaction(id));
      if (cacheResponse.success && cacheResponse.data) {
        return cacheResponse;
      }

      // 2. Buscar do Supabase
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const transaction = sqlToTransaction(data);
      
      // Cachear para próximas consultas
      await db.set(KeyPatterns.transaction(id), transaction);

      return {
        success: true,
        data: transaction,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transaction',
      };
    }
  }

  /**
   * Get all transactions for a user (as payer or receiver)
   * ✅ BUSCA DO SUPABASE (fonte primária)
   */
  async getByUserId(userId: string, params?: Partial<PaginationParams>): Promise<DBResponse<Transaction[]>> {
    try {
      const { limit = 50, offset = 0 } = params || {};

      // 1. BUSCAR DO SUPABASE
      const supabase = getSupabaseClient();
      let query = supabase
        .from('transactions')
        .select('*')
        .or(`payer_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar transações do Supabase:', error);
        throw error;
      }

      const transactions = data.map(sqlToTransaction);
      console.log(`✅ ${transactions.length} transações carregadas do Supabase`);

      // 2. ATUALIZAR CACHE (opcional)
      try {
        const transactionIds: string[] = [];
        for (const transaction of transactions) {
          await db.set(KeyPatterns.transaction(transaction.id), transaction);
          transactionIds.push(transaction.id);
        }
        await db.set(KeyPatterns.transactionsByUser(userId), transactionIds);
      } catch (cacheError) {
        console.warn('⚠️ Erro ao cachear transações:', cacheError);
      }

      return {
        success: true,
        data: transactions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user transactions',
      };
    }
  }

  /**
   * Get transactions by freight ID
   * ✅ BUSCA DO SUPABASE
   */
  async getByFreightId(freightId: string): Promise<DBResponse<Transaction[]>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('freight_id', freightId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transactions = data.map(sqlToTransaction);

      // Cache
      for (const transaction of transactions) {
        await db.set(KeyPatterns.transaction(transaction.id), transaction);
      }

      return {
        success: true,
        data: transactions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get freight transactions',
      };
    }
  }

  /**
   * Update transaction status
   * ✅ ATUALIZA NO SUPABASE PRIMEIRO
   */
  async updateStatus(
    id: string,
    status: Transaction['status'],
    metadata?: any
  ): Promise<DBResponse<Transaction>> {
    try {
      const now = new Date().toISOString();

      // 1. ATUALIZAR NO SUPABASE
      const supabase = getSupabaseClient();
      const updateData: any = {
        payment_status: status,
        updated_at: now,
      };

      if (status === 'completed' || status === 'processing') {
        updateData.processed_at = now;
      }

      if (metadata) {
        updateData.metadata = metadata;
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updated = sqlToTransaction(data);

      // 2. ATUALIZAR CACHE
      try {
        await db.set(KeyPatterns.transaction(id), updated);
      } catch (cacheError) {
        console.warn('⚠️ Erro ao atualizar cache:', cacheError);
      }

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update transaction status',
      };
    }
  }

  /**
   * Get transaction statistics for a user
   * ✅ BUSCA DO SUPABASE
   */
  async getUserStats(userId: string): Promise<DBResponse<{
    totalSent: number;
    totalReceived: number;
    pendingCount: number;
    completedCount: number;
  }>> {
    try {
      const supabase = getSupabaseClient();

      // Total sent
      const { data: sentData, error: sentError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('payer_id', userId)
        .eq('payment_status', 'completed');

      if (sentError) throw sentError;

      const totalSent = sentData.reduce((sum, t) => sum + Number(t.amount), 0);

      // Total received
      const { data: receivedData, error: receivedError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('receiver_id', userId)
        .eq('payment_status', 'completed');

      if (receivedError) throw receivedError;

      const totalReceived = receivedData.reduce((sum, t) => sum + Number(t.amount), 0);

      // Counts
      const { count: pendingCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .or(`payer_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('payment_status', 'pending');

      const { count: completedCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .or(`payer_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('payment_status', 'completed');

      return {
        success: true,
        data: {
          totalSent,
          totalReceived,
          pendingCount: pendingCount || 0,
          completedCount: completedCount || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user stats',
      };
    }
  }

  /**
   * Get all transactions with pagination
   * ✅ BUSCA DO SUPABASE (admin only)
   */
  async getAll(params?: Partial<PaginationParams>): Promise<DBResponse<Transaction[]>> {
    try {
      const { limit = 50, offset = 0 } = params || {};

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const transactions = data.map(sqlToTransaction);

      return {
        success: true,
        data: transactions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get all transactions',
      };
    }
  }
}

export const transactionRepository = new TransactionRepository();

// Class is already exported via 'export class' above, no need to re-export