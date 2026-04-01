/**
 * Custom hook to load a single freight by ID from Supabase
 * Used for the /fretes/:id route (shareable direct links)
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../supabase/client';

// Reuse the status mapping from useFreights
function mapSupabaseStatusToLocal(status: string): string {
  const statusMap: Record<string, string> = {
    'open': 'active',
    'active': 'active',
    'draft': 'draft',
    'in_transit': 'in-transit',
    'in-transit': 'in-transit',
    'completed': 'completed',
    'delivered': 'completed',
    'cancelled': 'cancelled',
    'contracted': 'contracted',
    'inactive': 'inactive',
    'scheduled': 'scheduled',
  };
  return statusMap[status] || 'active';
}

function parsePrice(price: string): number | undefined {
  try {
    const cleaned = price.replace(/[^\d,.]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  } catch {
    return undefined;
  }
}

export function useFreightById(freightId: string) {
  const [freight, setFreight] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFreight = useCallback(async () => {
    if (!freightId) {
      setError('ID do frete não informado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseClient();

      // Load the specific freight
      const { data: f, error: supabaseError } = await supabase
        .from('freights')
        .select('*')
        .eq('id', freightId)
        .single();

      if (supabaseError || !f) {
        console.error('❌ [useFreightById] Erro ao carregar frete:', supabaseError);
        setError('Frete não encontrado');
        setFreight(null);
        setLoading(false);
        return;
      }

      // Load publisher profile (avatar, name, phone)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, avatar_url, name, phone')
        .eq('id', f.publisher_id)
        .single();

      const companyLogo = profile?.avatar_url || '';
      const companyName = profile?.name || f.metadata?.customerName || 'Não informado';
      const publisherPhone = profile?.phone || '';

      // Detect paused freights
      const isPaused = f.visibility === 'private' && f.metadata?.is_paused === true;

      const transformedFreight = {
        id: f.id,
        freight_code: f.freight_code || undefined,
        userId: f.publisher_id,
        customerId: f.publisher_id,
        customerName: companyName,
        companyLogo,
        publisherPhone,
        status: isPaused ? 'inactive' : mapSupabaseStatusToLocal(f.status),
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
        // Additional form fields from metadata
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
        createdAt: f.created_at,
        updatedAt: f.updated_at,
        quotesCount: f.quotes_count || 0,
        type: f.metadata?.freightType || 'regular',
        exposureLevel: f.metadata?.exposureLevel || 'Média exposição',
        views: f.views_count || 0,
        acceptedDriverId: f.accepted_driver_id || undefined,
        acceptedDriverName: f.accepted_driver_name || undefined,
        acceptedQuoteId: f.accepted_quote_id || undefined,
        acceptedQuoteValue: f.accepted_quote_value || undefined,
      };

      setFreight(transformedFreight);
    } catch (err) {
      console.error('❌ [useFreightById] Erro:', err);
      setError('Erro ao carregar frete');
      setFreight(null);
    } finally {
      setLoading(false);
    }
  }, [freightId]);

  useEffect(() => {
    loadFreight();
  }, [loadFreight]);

  return { freight, loading, error, reload: loadFreight };
}