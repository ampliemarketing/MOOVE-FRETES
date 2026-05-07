import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from './AppContext';
import { getSupabaseClient } from '../../utils/supabase/client';
import { database } from '../../utils/database';
import { syncAllUserData, loadAllUserDataFromSupabase, startAutoSync, stopAutoSync, checkProfileComplete } from '../../utils/universal-sync';

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  authenticated: boolean;
  profileIncomplete: boolean;
  incompleteUserType: 'caminhoneiro' | 'transportadora' | 'agenciador' | null;
  login: (email: string, password: string, expectedType?: 'caminhoneiro' | 'transportadora' | 'agenciador') => Promise<void>;
  logout: () => Promise<void>;
  handleVerificationComplete: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  loading: true,
  authenticated: false,
  profileIncomplete: false,
  incompleteUserType: null,
  login: async () => {},
  logout: async () => {},
  handleVerificationComplete: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [incompleteUserType, setIncompleteUserType] = useState<'caminhoneiro' | 'transportadora' | 'agenciador' | null>(null);

  // Helper: build user object from profile
  const buildUserFromProfile = (profile: any, collaborator?: any) => {
    const userObj: any = {
      id: profile.id,
      email: profile.email,
      name: profile.name || 'Usuário',
      userType: profile.userType,
      phone: profile.phone || '',
      verified: profile.verified || false,
      rating: profile.rating || 0,
      totalTrips: profile.totalFreights || 0,
      location: profile.location || '',
      avatar: profile.profile?.avatar || profile.avatar,
      profile: profile.profile,
      currentLocation: profile.currentLocation,
      preferredRoutes: profile.preferredRoutes,
      vehicleTypes: profile.vehicleTypes,
      trailerTypes: profile.trailerTypes,
      available: profile.available,
      availabilityExpiresAt: profile.availabilityExpiresAt,
    };
    if (collaborator) {
      userObj.collaborator = collaborator.collaborator;
      userObj.company = collaborator.company;
    }
    return userObj;
  };

  // Setup repositories userId
  const setupRepositories = async (userId: string) => {
    try {
      const { freightRepository } = await import('../../utils/database/repositories/freight-repository');
      freightRepository.setCurrentUserId(userId);
    } catch (e) {
      console.error('⚠️ Erro ao configurar userId nos repositories:', e);
    }
  };

  const clearRepositories = async () => {
    try {
      const { freightRepository } = await import('../../utils/database/repositories/freight-repository');
      freightRepository.setCurrentUserId(undefined);
    } catch (e) {}
  };

  // Check profile completeness and reload fresh data
  const checkAndReloadProfile = async (userWithCollaborator: any) => {
    const profileComplete = await checkProfileComplete(userWithCollaborator.id);
    if (!profileComplete.isComplete) {
      setProfileIncomplete(true);
      setIncompleteUserType(profileComplete.userType || userWithCollaborator.userType);
    } else {
      const { loadUserProfileFromSupabase } = await import('../../utils/universal-sync');
      const freshProfile = await loadUserProfileFromSupabase(userWithCollaborator.id);
      if (freshProfile) {
        const updatedUser = buildUserFromProfile(freshProfile, 
          userWithCollaborator.collaborator ? userWithCollaborator : null
        );
        setUser(updatedUser);
      }
    }
  };

  // Initialize - restore session
  useEffect(() => {
    const initializeApp = async () => {
      if (typeof window !== 'undefined') {
        (window as any)._MAISFRETE_PRODUCTION = true;
        (window as any)._MAISFRETE_DEMO_ONLY = false;
        (window as any)._MAISFRETE_LOCAL_ONLY = false;
      }

      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const { loadUserProfileFromSupabase } = await import('../../utils/universal-sync');
          const profile = await loadUserProfileFromSupabase(session.user.id);

          if (profile) {
            const userWithData = buildUserFromProfile(profile);
            await database.users.create(userWithData);

            // Sync with profiles table
            try {
              const { data: existingUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', session.user.id)
                .single();

              if (!existingUser) {
                await supabase.from('profiles').upsert({
                  id: session.user.id,
                  email: session.user.email,
                  user_type: profile.userType || 'caminhoneiro',
                  name: profile.name || 'Usuário',
                  phone: profile.phone || '',
                  cpf: profile.cpf || '',
                  cnpj: profile.cnpj || '',
                  avatar_url: profile.avatar || '',
                  bio: profile.bio || '',
                  rating: profile.rating || 0,
                  total_freights: profile.totalFreights || 0,
                  completed_freights: profile.completedFreights || 0,
                  verification_status: profile.verificationStatus || 'pending',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
              }
            } catch {}

            const { loadCollaboratorData } = await import('../../utils/load-collaborator-on-login');
            const userWithCollaborator = await loadCollaboratorData(userWithData);

            setUser(userWithCollaborator);
            setAuthenticated(true);
            await setupRepositories(userWithCollaborator.id);
            stopAutoSync();

            await checkAndReloadProfile(userWithCollaborator);
          } else {
            await supabase.auth.signOut();
          }
        }
      } catch (error) {
        console.error('❌ Erro ao restaurar sessão:', error);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      setLoading(false);
    };

    initializeApp();
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string, expectedType?: 'caminhoneiro' | 'transportadora' | 'agenciador') => {
    setLoading(true);
    try {
      if (!email?.trim()) throw new Error('Email não fornecido');
      if (!password?.trim()) throw new Error('Senha não fornecida');

      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        await supabase.auth.signOut();
        setAuthenticated(false);
        setUser(null);
        throw new Error(error.message || 'Erro ao fazer login');
      }

      if (!data.user || !data.session) {
        throw new Error('Erro ao fazer login: usuário ou sessão não retornados');
      }

      // Check user type if expectedType is provided
      const { loadUserProfileFromSupabase } = await import('../../utils/universal-sync');
      const supabaseProfile = await loadUserProfileFromSupabase(data.user.id);
      const userType = supabaseProfile?.userType || data.user.user_metadata?.userType || data.user.user_metadata?.user_type;

      if (expectedType) {
        const isMatch = (expectedType === 'caminhoneiro' && userType === 'caminhoneiro') || 
                        (expectedType === 'transportadora' && (userType === 'transportadora' || userType === 'agenciador'));
        
        if (!isMatch) {
          await supabase.auth.signOut();
          setAuthenticated(false);
          setUser(null);
          const typeLabel = expectedType === 'caminhoneiro' ? 'Motorista' : 'Transportadora/Empresa';
          throw new Error(`Esta conta não é de um ${typeLabel}. Por favor, selecione o perfil correto.`);
        }
      }

      let userResponse = await database.users.getById(data.user.id);

      if (!userResponse.success || !userResponse.data) {
        const finalUserType = userType || 'shipper';

        const newUserData: any = {
          id: data.user.id,
          email: data.user.email,
          name: supabaseProfile?.name || data.user.user_metadata?.name || 'Usuário',
          userType: finalUserType,
          phone: supabaseProfile?.phone || data.user.user_metadata?.phone || '',
          verified: supabaseProfile?.verified || data.user.user_metadata?.verified || false,
          rating: supabaseProfile?.rating || data.user.user_metadata?.rating || 0,
          totalTrips: supabaseProfile?.totalFreights || data.user.user_metadata?.totalFreights || 0,
          location: supabaseProfile?.location || data.user.user_metadata?.location || '',
          profile: {
            avatar: supabaseProfile?.profile?.avatar || '',
            bio: supabaseProfile?.profile?.bio || '',
            rating: supabaseProfile?.profile?.rating || 0,
            totalFreights: supabaseProfile?.profile?.totalFreights || 0,
            completedFreights: supabaseProfile?.profile?.completedFreights || 0,
            verificationStatus: supabaseProfile?.profile?.verificationStatus || 'verified',
          },
          gamification: supabaseProfile?.gamification || { level: 1, xp: 0, badges: [], achievements: [] },
          preferences: supabaseProfile?.preferences || { notifications: true, emailAlerts: true },
        };

        userResponse = await database.users.create(newUserData);
        if (!userResponse.success || !userResponse.data) {
          throw new Error('Não foi possível criar usuário no database local');
        }

        // Sync to profiles table
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            user_type: newUserData.userType,
            name: newUserData.name,
            phone: newUserData.phone,
            cpf: supabaseProfile?.cpf || '',
            cnpj: supabaseProfile?.cnpj || '',
            avatar_url: newUserData.profile.avatar,
            bio: newUserData.profile.bio,
            rating: newUserData.profile.rating,
            total_freights: newUserData.profile.totalFreights,
            completed_freights: newUserData.profile.completedFreights,
            verification_status: newUserData.profile.verificationStatus,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        } catch {}
      }

      const loggedUser = userResponse.data;
      const { loadCollaboratorData } = await import('../../utils/load-collaborator-on-login');
      const userWithCollaborator = await loadCollaboratorData(loggedUser);

      setUser(userWithCollaborator);
      setAuthenticated(true);
      await setupRepositories(userWithCollaborator.id);
      stopAutoSync();

      await checkAndReloadProfile(userWithCollaborator);
    } catch (error) {
      console.error('❌ ERRO NO LOGIN:', error instanceof Error ? error.message : 'Erro desconhecido');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    // Parar sync antes de qualquer limpeza
    stopAutoSync();

    setUser(null);
    setAuthenticated(false);
    setProfileIncomplete(false);
    setIncompleteUserType(null);
    await clearRepositories();

    // Limpar todo o localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Limpar sessionStorage
    sessionStorage.clear();

    // Limpar todos os cookies do domínio
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      document.cookie = `${name}=; path=/; max-age=0`;
    });

    // Limpar caches do Service Worker
    if (typeof caches !== 'undefined') {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  }, []);

  // Handle verification complete
  const handleVerificationComplete = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await database.users.getById(user.id);
      if (response.success && response.data) {
        setUser(response.data as any);
      }
    } catch (error) {
      console.error('Error reloading user data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      loading,
      authenticated,
      profileIncomplete,
      incompleteUserType,
      login,
      logout,
      handleVerificationComplete,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
