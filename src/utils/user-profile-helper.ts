import { supabase } from './supabase/client';
import type { Driver, Company } from './database/schema';

export interface UnifiedUserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  userType: 'caminhoneiro' | 'transportadora' | 'embarcador' | 'agenciador';
  createdAt: string;
  avatar?: string;
  avatarUrl?: string;
  
  // Dados do motorista (se for caminhoneiro)
  driver?: {
    cnh?: string;
    cnhCategory?: string;
    cnhValidity?: string;
    vehicle?: {
      type?: string;
      plate?: string;
      model?: string;
      year?: string;
      capacity?: string;
    };
    currentLocation?: {
      city?: string;
      state?: string;
    };
    preferredRoutes?: string[];
    specializations?: string[];
  };
  
  // Dados da empresa (se for transportadora/embarcador/agenciador)
  company?: {
    companyName?: string;
    cnpj?: string;
    description?: string;
    website?: string;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      cep?: string;
    };
    fleetSize?: number;
  };
  
  // Dados de exibição
  displayData?: {
    rating?: number;
    completedTrips?: number;
    verified?: boolean;
    status?: 'pending' | 'approved' | 'rejected';
  };
}

export async function fetchCompleteUserProfile(userId: string): Promise<UnifiedUserProfile | null> {
  try {
    
    // Buscar dados básicos do perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Erro ao buscar perfil:', profileError);
      return null;
    }

    if (!profile) {
      return null;
    }


    // Buscar avatar do usuário (de profiles ou users)
    let avatarUrl: string | undefined = profile.avatar || profile.avatar_url;
    
    // Se não encontrou no profiles, tentar na tabela profiles novamente (com outros campos)
    if (!avatarUrl) {
      const { data: userData } = await supabase
        .from('profiles')  // ✅ Alterado de 'users' para 'profiles' (tabela users não existe mais)
        .select('avatar_url')
        .eq('id', userId)
        .single();
      
      if (userData) {
        avatarUrl = userData.avatar_url;
      }
    }

    // [REVISAR] console.log('🖼️ [fetchCompleteUserProfile] Avatar encontrado:', {
    // hasAvatar: !!avatarUrl,
    // avatarPreview: avatarUrl?.substring(0, 100)
    // });

    const baseProfile: UnifiedUserProfile = {
      id: profile.id,
      email: profile.email || '',
      name: profile.name || profile.email || 'Usuário',
      phone: profile.phone,
      userType: profile.user_type,
      createdAt: profile.created_at,
      avatar: avatarUrl,
      avatarUrl: avatarUrl,
      displayData: {
        rating: profile.rating || 0,
        completedTrips: profile.completed_freights || 0,
        verified: profile.email_verified || false,
        status: profile.verification_status || 'pending',
      }
    };

    // Se for caminhoneiro, buscar dados do motorista
    if (profile.user_type === 'caminhoneiro') {
      
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (driverError) {
      }

      if (driver) {
        
        baseProfile.driver = {
          cnh: driver.cnh,
          cnhCategory: driver.cnh_category,
          cnhValidity: driver.cnh_expiry,
          vehicle: {
            type: driver.vehicle_type,
            plate: driver.vehicle_plate,
            model: driver.vehicle_model,
            year: driver.vehicle_year,
            capacity: driver.vehicle_capacity ? `${driver.vehicle_capacity} kg` : undefined,
          },
          currentLocation: driver.address?.city && driver.address?.state ? {  // ✅ address JSONB
            city: driver.address.city,
            state: driver.address.state,
          } : undefined,
          preferredRoutes: driver.preferred_routes || [],
          specializations: driver.specializations || [],
        };
        
        // Atualizar rating e trips se houver
        if (driver.rating) baseProfile.displayData!.rating = driver.rating;
        if (driver.completed_trips) baseProfile.displayData!.completedTrips = driver.completed_trips;
      } else {
        // Não é um erro - apenas mostra dados básicos do perfil
      }
    }

    // Se for transportadora/embarcador/agenciador, buscar dados da empresa
    if (['transportadora', 'embarcador', 'agenciador'].includes(profile.user_type)) {
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (company) {
        baseProfile.company = {
          companyName: company.company_name,
          cnpj: company.cnpj,
          description: company.description,
          website: company.website,
          address: company.address ? {
            street: company.address.street,
            number: company.address.number,
            complement: company.address.complement,
            neighborhood: company.address.neighborhood,
            city: company.address.city,
            state: company.address.state,
            cep: company.address.cep,
          } : undefined,
          fleetSize: company.fleet_size,
        };
      } else {
      }
    }


    return baseProfile;
  } catch (error) {
    console.error('❌ Erro em fetchCompleteUserProfile:', error);
    return null;
  }
}

export function formatUserType(userType: string): string {
  const types: Record<string, string> = {
    'caminhoneiro': 'Motorista',
    'transportadora': 'Transportadora',
    'embarcador': 'Embarcador',
    'agenciador': 'Agenciador',
  };
  return types[userType] || userType;
}

export function getUserTypeColor(userType: string): string {
  const colors: Record<string, string> = {
    'caminhoneiro': 'bg-blue-100 text-blue-700 border-blue-200',
    'transportadora': 'bg-green-100 text-green-700 border-green-200',
    'embarcador': 'bg-purple-100 text-purple-700 border-purple-200',
    'agenciador': 'bg-orange-100 text-orange-700 border-orange-200',
  };
  return colors[userType] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function formatStatus(status: string): string {
  const statuses: Record<string, string> = {
    'pending': 'Pendente',
    'approved': 'Aprovado',
    'rejected': 'Rejeitado',
  };
  return statuses[status] || status;
}

export function getStatusColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'pending': 'secondary',
    'approved': 'default',
    'rejected': 'destructive',
  };
  return colors[status] || 'secondary';
}