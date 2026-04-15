/**
 * Custom hook for freight management
 * COM SINCRONIZAÇÃO AUTOMÁTICA SUPABASE
 */

import { useState, useEffect, useCallback } from 'react';
import { database } from '../database';
import { getSupabaseClient } from '../supabase/client';
import { toast } from 'sonner@2.0.3';
import { mapSupabaseStatusToLocal } from '../freight-status';
import { logger } from '../logger';

export interface Freight {
  id: string;
  freight_code?: string; // Código único no padrão placa brasileira (AAA0A00)
  userId: string;
  customerId: string;
  customerName?: string;
  status: 'rascunho' | 'publicado' | 'em_cotacao' | 'em_andamento' | 'concluido' | 'cancelado' | 'active' | 'draft' | 'inactive' | 'completed' | 'in-transit' | 'contracted' | 'cancelled' | 'scheduled';
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
  cargo: {
    type: string;
    weight: number;
    volume?: number;
    description?: string;
    value?: number;
  } | string;
  vehicleType?: string;
  truckType?: string;
  trailerType?: string;
  category?: string;
  weight?: string;
  distance?: number;
  estimatedPrice?: number;
  price?: string;
  pickupDate?: string;
  deliveryDate?: string;
  observations?: string;
  createdAt: string;
  updatedAt?: string;
  quotesCount?: number;
  type?: 'plus' | 'regular';
  exposureLevel?: string;
  views?: number;
  acceptedDriverId?: string;
  acceptedDriverName?: string;
  acceptedQuoteId?: string;
  acceptedQuoteValue?: string; // ✅ ADICIONADO: Valor da cotação aceita
  companyLogo?: string; // ✅ ADICIONADO: Logo da empresa (avatar)
  publisherPhone?: string; // ✅ ADICIONADO: Telefone da empresa para WhatsApp
  // ✅ CAMPOS ADICIONAIS DO FORMULÁRIO
  product?: string;
  species?: string;
  cargoType?: string;
  volumes?: number;
  volumeUnit?: string;
  needsCover?: boolean;
  needsTracker?: boolean;
  isInsured?: boolean;
  cubicWeight?: number;
  totalCubicMeters?: number;
  length?: number;
  width?: number;
  height?: number;
  selectedLightVehicles?: string[];
  selectedMediumVehicles?: string[];
  selectedHeavyVehicles?: string[];
  selectedClosedTrailers?: string[];
  selectedOpenTrailers?: string[];
  selectedSpecialTrailers?: string[];
  freightValueType?: string;
  valueCalculation?: string;
  paymentIncluded?: boolean;
  paymentMethod?: string;
  advancePayment?: number;
  urgencyType?: string;
  scheduledDate?: string;
  hasAdditionalCargo?: boolean;
  additionalCargoDetails?: string;
  // ✅ FIM DOS CAMPOS ADICIONAIS
}


/**
 * Parse price string to number
 */
function parsePrice(price: string): number | undefined {
  try {
    const cleaned = price.replace(/[^\d,.]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  } catch {
    return undefined;
  }
}

export function useFreights() {
  const [freights, setFreights] = useState<Freight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 🔄 CARREGAR FRETES DIRETAMENTE DO SUPABASE
   * LocalStorage é apenas cache fallback
   */
  const loadFreights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 🟢 CARREGAR DIRETAMENTE DO SUPABASE (FONTE PRIMÁRIA)
      try {
        const supabase = getSupabaseClient();
        
        // Verificar se há sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          
          // Carregar TODOS os fretes do Supabase (não apenas do usuário)
          const { data: supabaseFreights, error: supabaseError } = await supabase
            .from('freights')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (supabaseError) {
            logger.error('❌ [useFreights] Erro ao carregar do Supabase:', supabaseError);
            throw supabaseError;
          }
          
          // 🔍 DEBUG: Verificar quantos fretes vieram do Supabase
          logger.log('🔍 [useFreights] Fretes retornados do Supabase:', {
            count: supabaseFreights?.length || 0,
            hasData: !!supabaseFreights,
          });
          
          if (supabaseFreights && supabaseFreights.length > 0) {
            
            // 🔍 DEBUG: Verificar se metadata está vindo do Supabase
            logger.log('🔍 [useFreights] Primeiro frete do Supabase (com metadata):', {
              id: supabaseFreights[0].id,
              hasMetadata: !!supabaseFreights[0].metadata,
              metadataKeys: supabaseFreights[0].metadata ? Object.keys(supabaseFreights[0].metadata) : [],
              metadata: supabaseFreights[0].metadata,
              pickupDate: supabaseFreights[0].pickup_date,
              deliveryDate: supabaseFreights[0].delivery_date,
            });
            
            // 🖼️ BUSCAR LOGOS DAS EMPRESAS (avatares) - OTIMIZADO
            // Buscar todos os IDs únicos de publishers
            const publisherIds = [...new Set(supabaseFreights.map(f => f.publisher_id))];
            
            logger.log('📱 [useFreights] Buscando dados de publishers:', publisherIds);
            
            // Buscar avatares, NOMES e TELEFONES de PROFILES
            const profilesResult = await supabase
              .from('profiles')
              .select('id, avatar_url, name, phone')
              .in('id', publisherIds);
            
            // Criar mapas de publisher_id -> avatar_url, publisher_id -> name, publisher_id -> phone
            const avatarMap = new Map<string, string>();
            const nameMap = new Map<string, string>();
            const phoneMap = new Map<string, string>();
            
            // Pegar dados da tabela profiles
            if (profilesResult.data) {
              profilesResult.data.forEach(profile => {
                if (profile.avatar_url) {
                  // ✅ SALVAR PATH (não URL) - conversão acontece nos componentes
                  avatarMap.set(profile.id, profile.avatar_url);
                }
                if (profile.name) {
                  nameMap.set(profile.id, profile.name);
                }
                if (profile.phone) {
                  phoneMap.set(profile.id, profile.phone);
                  logger.log('📱 [useFreights] Telefone encontrado:', { 
                    profileId: profile.id, 
                    phone: profile.phone,
                    name: profile.name
                  });
                }
              });
            }
            
            logger.log('📱 [useFreights] Totais carregados:', {
              avatars: avatarMap.size,
              names: nameMap.size,
              phones: phoneMap.size
            });
            logger.log('📱 [useFreights] Mapa de telefones completo:', Array.from(phoneMap.entries()));
            
            if (avatarMap.size === 0) {
              logger.warn('⚠️ [useFreights] NENHUM avatar foi carregado! Verifique se as empresas têm avatar_url nas tabelas.');
            }
            
            if (phoneMap.size === 0) {
              logger.warn('⚠️ [useFreights] NENHUM telefone foi carregado! Verifique se os profiles têm o campo phone preenchido.');
            }
            
            // Transformar dados do Supabase para o formato esperado
            const transformedFreights = supabaseFreights.map(f => {
              // ⚠️ DETECTAR FRETES PAUSADOS: visibility 'private' + metadata.is_paused = true
              const isPaused = f.visibility === 'private' && f.metadata?.is_paused === true;
              
              // 🖼️ PEGAR LOGO DA EMPRESA DO MAPA
              const companyLogo = avatarMap.get(f.publisher_id) || '';
              
              // 📛 PEGAR NOME DA EMPRESA DO MAPA (prioridade: nameMap > metadata)
              const companyName = nameMap.get(f.publisher_id) || f.metadata?.customerName || 'Não informado';

              // 📞 PEGAR TELEFONE DA EMPRESA DO MAPA
              const publisherPhone = phoneMap.get(f.publisher_id) || '';
              
              // ✅ Log removido para reduzir poluição do console
              
              const freight: Freight = {
                id: f.id,
                userId: f.publisher_id,
                customerId: f.publisher_id,
                customerName: companyName, // ✅ USAR NOME DO MAPA ao invés do metadata
                companyLogo, // ✅ ADICIONADO: Logo da empresa (avatar)
                publisherPhone, // ✅ ADICIONADO: Telefone da empresa
                status: isPaused ? 'inactive' : mapSupabaseStatusToLocal(f.status), // ⚠️ Se pausado, forçar status 'inactive'
                origin: {
                  city: f.origin_city,
                  state: f.origin_state,
                  address: f.origin_address || '',
                  cep: f.origin_cep || '',
                },
                destination: {
                  city: f.destination_city,
                  state: f.destination_state,
                  address: f.destination_address || '',
                  cep: f.destination_cep || '',
                },
                cargo: {
                  type: f.cargo_type || 'Carga geral',
                  weight: f.weight_kg || 0,
                  description: f.description || '',
                },
                weight: f.metadata?.weight || (f.weight_kg ? `${f.weight_kg} kg` : 'A definir'),
                truckType: f.metadata?.truckType || f.vehicle_types?.[0] || 'Truck',
                category: f.metadata?.category || 'Carga geral',
                vehicleType: f.vehicle_types?.[0] || 'Truck',
                trailerType: f.metadata?.category || 'Carga geral',
                price: f.metadata?.price || 'A combinar',
                observations: f.metadata?.observations || f.description || '',
                estimatedPrice: f.metadata?.price ? parsePrice(f.metadata.price) : undefined,
                pickupDate: f.pickup_date || undefined,
                deliveryDate: f.delivery_date || undefined,
                // ✅ CAMPOS ADICIONAIS DO FORMULÁRIO
                product: f.metadata?.product || undefined,
                species: f.metadata?.species || undefined,
                cargoType: f.metadata?.cargoType || undefined,
                volumes: f.metadata?.volumes || undefined,
                volumeUnit: f.metadata?.volumeUnit || undefined,
                needsCover: f.metadata?.needsCover || false,
                needsTracker: f.metadata?.needsTracker || false,
                isInsured: f.metadata?.isInsured || false,
                cubicWeight: f.metadata?.cubicWeight || undefined,
                totalCubicMeters: f.metadata?.totalCubicMeters || undefined,
                length: f.metadata?.length || undefined,
                width: f.metadata?.width || undefined,
                height: f.metadata?.height || undefined,
                selectedLightVehicles: f.metadata?.selectedLightVehicles || [],
                selectedMediumVehicles: f.metadata?.selectedMediumVehicles || [],
                selectedHeavyVehicles: f.metadata?.selectedHeavyVehicles || [],
                selectedClosedTrailers: f.metadata?.selectedClosedTrailers || [],
                selectedOpenTrailers: f.metadata?.selectedOpenTrailers || [],
                selectedSpecialTrailers: f.metadata?.selectedSpecialTrailers || [],
                freightValueType: f.metadata?.freightValueType || undefined,
                valueCalculation: f.metadata?.valueCalculation || undefined,
                paymentIncluded: f.metadata?.paymentIncluded || undefined,
                paymentMethod: f.metadata?.paymentMethod || undefined,
                advancePayment: f.metadata?.advancePayment || undefined,
                urgencyType: f.metadata?.urgencyType || undefined,
                scheduledDate: f.metadata?.scheduledDate || f.pickup_date || undefined,
                hasAdditionalCargo: f.metadata?.hasAdditionalCargo || false,
                additionalCargoDetails: f.metadata?.additionalCargoDetails || undefined,
                // ✅ FIM DOS CAMPOS ADICIONAIS
                createdAt: f.created_at,
                updatedAt: f.updated_at,
                quotesCount: f.quotes_count || 0,
                type: f.metadata?.freightType || 'regular',
                exposureLevel: f.metadata?.exposureLevel || 'Média exposição',
                views: f.views_count || 0,
                acceptedDriverId: f.accepted_driver_id || undefined,
                acceptedDriverName: f.accepted_driver_name || undefined,
                acceptedQuoteId: f.accepted_quote_id || undefined,
                acceptedQuoteValue: f.accepted_quote_value || undefined, // ✅ ADICIONADO: Valor da cotação aceita
              };
              
              return freight;
            });
            
            setFreights(transformedFreights);
            return; // Sucesso - não precisa tentar LocalStorage
          } else {
            setFreights([]);
            return;
          }
        }
      } catch (supabaseErr) {
        logger.warn('⚠️ [useFreights] Erro ao carregar do Supabase, tentando LocalStorage:', supabaseErr);
      }
      
      // 📦 FALLBACK: Carregar do LocalStorage se Supabase falhar
      const response = await database.freights.getAll();
      
      if (response.success && response.data) {
        
        // Transformar dados do database para o formato esperado
        const transformedFreights = response.data.map(f => ({
          id: f.id,
          userId: f.customerId,
          customerId: f.customerId,
          customerName: f.customerName,
          status: f.status as any,
          origin: {
            city: f.origin.city,
            state: f.origin.state,
            address: f.origin.address,
            cep: f.origin.cep,
          },
          destination: {
            city: f.destination.city,
            state: f.destination.state,
            address: f.destination.address,
            cep: f.destination.cep,
          },
          cargo: f.cargo,
          weight: f.weight,
          truckType: f.truckType,
          category: f.category,
          vehicleType: f.truckType,
          trailerType: f.category,
          price: f.price,
          observations: f.observations,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          quotesCount: f.quotesCount || 0,
          type: f.type,
          exposureLevel: f.exposureLevel,
          views: f.views || 0,
          acceptedDriverId: f.acceptedDriverId || undefined,
          acceptedDriverName: f.acceptedDriverName || undefined,
          acceptedQuoteId: f.acceptedQuoteId || undefined,
          acceptedQuoteValue: f.acceptedQuoteValue || undefined, // ✅ ADICIONADO: Valor da cotação aceita
        }));
        
        setFreights(transformedFreights);
      } else {
        setFreights([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar fretes';
      setError(message);
      logger.error('❌ [useFreights] Erro ao carregar fretes:', err);
      setFreights([]);
    } finally {
      setLoading(false);
    }
  }, []); // ⚠️ DEPENDÊNCIAS VAZIAS - evita loop infinito

  const createFreight = useCallback(async (freight: Partial<Freight>) => {
    try {
      const response = await database.freights.create(freight as any);
      
      if (response.success) {
        
        // ⚠️ NÃO RECARREGAR AUTOMATICAMENTE - Evita loop infinito
        // A lista será recarregada naturalmente quando o componente for montado novamente
        // ou quando o usuário navegar para a tela de fretes
        
        // REMOVIDO: await loadFreights();
        
        toast.success('Frete criado com sucesso!');
        return { success: true, data: response.data };
      }
      
      logger.error('❌ [useFreights] Erro ao criar frete');
      return { success: false, error: 'Erro ao criar frete' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar frete';
      logger.error('❌ [useFreights] Erro:', err);
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);  // ⚠️ REMOVIDO loadFreights das dependências

  const updateFreight = useCallback(async (id: string, updates: Partial<Freight>) => {
    try {
      
      const response = await database.freights.update(id, updates as any);
      
      if (response.success) {
        
        // Aguardar sincronização
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Recarregar lista
        await loadFreights();
        
        toast.success('Frete atualizado com sucesso!');
        return { success: true, data: response.data };
      }
      
      return { success: false, error: 'Erro ao atualizar frete' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar frete';
      logger.error('❌ [useFreights] Erro:', err);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [loadFreights]);

  const deleteFreight = useCallback(async (id: string) => {
    try {
      
      const response = await database.freights.delete(id);
      
      if (response.success) {
        
        // Aguardar sincronização
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Recarregar lista
        await loadFreights();
        
        toast.success('Frete deletado com sucesso!');
        return { success: true };
      }
      
      return { success: false, error: 'Erro ao deletar frete' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar frete';
      logger.error('❌ [useFreights] Erro:', err);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [loadFreights]);

  useEffect(() => {
    loadFreights();
    
    // 🔄 Polling a cada 1 minuto (60000ms) para atualizar fretes
    const interval = setInterval(() => {
      loadFreights();
    }, 60000); // 60 segundos = 1 minuto
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ EXECUTAR APENAS UMA VEZ na montagem do componente

  return {
    freights,
    loading,
    error,
    loadFreights,
    createFreight,
    updateFreight,
    deleteFreight,
  };
}