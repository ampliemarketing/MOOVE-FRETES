/**
 * Custom hook to load a user's public profile by ID from Supabase
 * Used for the /perfil/:id route (shareable direct links)
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../supabase/client';

export interface PublicProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  userType: string;
  avatarUrl: string | null;
  bio: string | null;
  rating: number;
  totalFreights: number;
  completedFreights: number;
  cancelledFreights: number;
  verificationStatus: string;
  isActive: boolean;
  city: string | null;
  state: string | null;
  isOnline: boolean;
  lastSeen: string | null;
  totalRatings: number;
  totalDistanceKm: number;
  totalEarnings: number;
  memberSince: string;
  // Driver-specific fields
  driver?: {
    id: string;
    cnh: string;
    cnhCategory: string;
    cnhExpiry: string | null;
    experienceYears: number;
    specializations: string[];
    available: boolean;
    currentLocation: any;
    preferredRoutes: any;
    vehicleType: string | null;
    vehiclePlate: string | null;
    vehicleModel: string | null;
    vehicleYear: string | null;
    completedTrips: number;
    rntrc: string | null;
    vehicleTypes: string[];
    bodyTypes: string[];
  };
  // Company-specific fields
  company?: {
    id: string;
    tradeName: string;
    legalName: string;
    cnpj: string | null;
    address: any;
    totalFleet: number;
    activeFreights: number;
  };
}

export function useProfileById(profileId: string) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!profileId) {
      setError('ID do perfil não informado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseClient();

      // Load profile
      const { data: p, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError || !p) {
        console.error('❌ [useProfileById] Erro ao carregar perfil:', profileError);
        setError('Perfil não encontrado');
        setProfile(null);
        setLoading(false);
        return;
      }

      const transformed: PublicProfile = {
        id: p.id,
        email: p.email || '',
        name: p.name || 'Usuário',
        phone: p.phone || '',
        userType: p.user_type,
        avatarUrl: p.avatar_url,
        bio: p.bio,
        rating: p.rating || 0,
        totalFreights: p.total_freights || 0,
        completedFreights: p.completed_freights || 0,
        cancelledFreights: p.cancelled_freights || 0,
        verificationStatus: p.verification_status || 'pending',
        isActive: p.is_active !== false,
        city: p.city,
        state: p.state,
        isOnline: p.is_online || false,
        lastSeen: p.last_seen,
        totalRatings: p.total_ratings || 0,
        totalDistanceKm: p.total_distance_km || 0,
        totalEarnings: p.total_earnings || 0,
        memberSince: p.created_at,
      };

      // If driver, load driver data
      if (p.user_type === 'caminhoneiro') {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('*')
          .eq('user_id', profileId)
          .single();

        if (driverData) {
          transformed.driver = {
            id: driverData.id,
            cnh: driverData.cnh || '',
            cnhCategory: driverData.cnh_category || '',
            cnhExpiry: driverData.cnh_expiry,
            experienceYears: driverData.experience_years || 0,
            specializations: driverData.specializations || [],
            available: driverData.available !== false,
            currentLocation: driverData.current_location,
            preferredRoutes: driverData.preferred_routes,
            vehicleType: driverData.vehicle_type,
            vehiclePlate: driverData.vehicle_plate,
            vehicleModel: driverData.vehicle_model,
            vehicleYear: driverData.vehicle_year,
            completedTrips: driverData.completed_trips || 0,
            rntrc: driverData.rntrc,
            vehicleTypes: driverData.vehicle_types || [],
            bodyTypes: driverData.body_types || [],
          };
        }
      }

      // If company type, load company data
      if (['transportadora', 'embarcador', 'agenciador'].includes(p.user_type)) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', profileId)
          .single();

        if (companyData) {
          transformed.company = {
            id: companyData.id,
            tradeName: companyData.trading_name || companyData.company_name || '',
            legalName: companyData.company_name || '',
            cnpj: companyData.cnpj,
            address: companyData.address,
            totalFleet: companyData.fleet_size || 0,
            activeFreights: 0,
          };
        }
      }

      setProfile(transformed);
    } catch (err) {
      console.error('❌ [useProfileById] Erro:', err);
      setError('Erro ao carregar perfil');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return { profile, loading, error, reload: loadProfile };
}