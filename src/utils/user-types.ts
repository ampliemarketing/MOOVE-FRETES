// Utility file to handle user type compatibility between auth and app contexts

import { User as AuthUser } from '../components/hooks/useSupabase';
import { User as AppUser } from '../components/contexts/AppContext';

// Convert auth user type to app user type
export function convertAuthUserToAppUser(authUser: AuthUser): AppUser {
  return {
    id: authUser.id,
    name: authUser.name || 'Usuário',
    email: authUser.email,
    userType: convertUserType(authUser.userType),
    verified: authUser.verified,
    rating: authUser.rating || 4.5,
    totalTrips: authUser.totalTrips,
    level: 1,
    totalXP: 0,
    location: 'São Paulo, SP',
    phone: authUser.user_metadata?.phone,
    company: authUser.user_metadata?.company_name,
    createdAt: authUser.createdAt,
    user_metadata: authUser.user_metadata,
    preferences: {
      notifications: true,
      darkMode: false,
      language: 'pt' as const,
      autoLocation: true
    }
  };
}

// Convert between different user type formats
function convertUserType(authUserType: 'shipper' | 'carrier' | 'driver'): 'embarcador' | 'transportadora' | 'caminhoneiro' {
  switch (authUserType) {
    case 'driver':
      return 'caminhoneiro';
    case 'carrier':
      return 'transportadora';
    case 'shipper':
    default:
      return 'embarcador';
  }
}

// Convert back from app user type to auth user type
export function convertAppUserTypeToAuth(appUserType: 'embarcador' | 'transportadora' | 'caminhoneiro'): 'shipper' | 'carrier' | 'driver' {
  switch (appUserType) {
    case 'caminhoneiro':
      return 'driver';
    case 'transportadora':
      return 'carrier';
    case 'embarcador':
    default:
      return 'shipper';
  }
}

// Get user type display name in Portuguese
export function getUserTypeDisplayName(userType: 'embarcador' | 'transportadora' | 'caminhoneiro'): string {
  const typeLabels = {
    'embarcador': 'Embarcador',
    'transportadora': 'Transportadora',
    'caminhoneiro': 'Caminhoneiro'
  };
  return typeLabels[userType];
}