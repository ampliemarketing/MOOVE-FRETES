import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { toast } from 'sonner@2.0.3';
import type { User as DBUser } from '../../utils/database/schema';

// Sistema em produção - usando dados reais do Supabase PostgreSQL
const PRODUCTION_MODE = true;

// Extend the database User type with AppContext-specific fields
export interface User extends DBUser {
  verified: boolean;
  rating: number;
  totalTrips: number;
  level: number;
  totalXP: number;
  avatar?: string;
  location: string;
  company?: string;
  user_metadata?: {
    user_type: string;
    full_name: string;
    phone: string;
    company_name?: string;
  };
  // Dados de colaborador (se for colaborador de uma transportadora/agenciador)
  collaborator?: {
    id: string;
    companyId: string;
    companyName: string;
    role: string;
    isActive: boolean;
    isSuperAdmin: boolean;
  };
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'quote' | 'freight' | 'social';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
  data?: any;
}

export interface Activity {
  id: string;
  type: 'freight_created' | 'freight_completed' | 'quote_received' | 'social_interaction' | 'achievement';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'info' | 'warning' | 'error';
  data?: any;
}

export interface AppStats {
  activeFreights: number;
  pendingQuotes: number;
  completedTrips: number;
  monthlyRevenue: number;
  availableDrivers: number;
  rating: number;
  totalDistance: number;
  punctuality: number;
  responseTime: number;
}

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  notifications: Notification[];
  activities: Activity[];
  stats: AppStats;
  favorites: string[];
  searchHistory: string[];
  activeScreen: string;
  darkMode: boolean;
  connectionStatus: 'online' | 'offline' | 'syncing';
  lastSync: string | null;
  demoMode: boolean;
}

type AppAction = 
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'ADD_ACTIVITY'; payload: Activity }
  | { type: 'UPDATE_STATS'; payload: Partial<AppStats> }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'ADD_SEARCH'; payload: string }
  | { type: 'SET_ACTIVE_SCREEN'; payload: string }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'online' | 'offline' | 'syncing' }
  | { type: 'UPDATE_LAST_SYNC'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'INIT_DEMO_MODE' }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] };

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  notifications: [],
  activities: [],
  stats: {
    activeFreights: 0,
    pendingQuotes: 0,
    completedTrips: 0,
    monthlyRevenue: 0,
    availableDrivers: 0,
    rating: 0,
    totalDistance: 0,
    punctuality: 0,
    responseTime: 0
  },
  favorites: [],
  searchHistory: [],
  activeScreen: 'dashboard',
  darkMode: false,
  connectionStatus: 'online', // Sistema em produção
  lastSync: null,
  demoMode: false // Sem modo demo - sistema real
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };

    case 'INIT_DEMO_MODE':
      // Mantido para compatibilidade mas não altera o estado
      return state;

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications]
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        )
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    case 'ADD_ACTIVITY':
      return {
        ...state,
        activities: [action.payload, ...state.activities.slice(0, 49)] // Keep last 50
      };

    case 'UPDATE_STATS':
      return {
        ...state,
        stats: { ...state.stats, ...action.payload }
      };

    case 'TOGGLE_FAVORITE':
      const isFavorite = state.favorites.includes(action.payload);
      return {
        ...state,
        favorites: isFavorite
          ? state.favorites.filter(id => id !== action.payload)
          : [...state.favorites, action.payload]
      };

    case 'ADD_SEARCH':
      const newHistory = [action.payload, ...state.searchHistory.filter(s => s !== action.payload)].slice(0, 10);
      return {
        ...state,
        searchHistory: newHistory
      };

    case 'SET_ACTIVE_SCREEN':
      return {
        ...state,
        activeScreen: action.payload
      };

    case 'TOGGLE_DARK_MODE':
      return {
        ...state,
        darkMode: !state.darkMode
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload
      };

    case 'UPDATE_LAST_SYNC':
      return {
        ...state,
        lastSync: action.payload
      };

    case 'LOGOUT':
      return {
        ...initialState,
        loading: false,
        darkMode: state.darkMode, // Preserve theme preference
        connectionStatus: 'online' // Restore online status
      };

    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload
      };

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    setUser: (user: User) => void;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
    markNotificationRead: (id: string) => void;
    addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
    updateStats: (stats: Partial<AppStats>) => void;
    toggleFavorite: (id: string) => void;
    addSearch: (query: string) => void;
    setActiveScreen: (screen: string) => void;
    logout: () => void;
  };
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize app with Supabase backend connection
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('AppProvider: Initializing with Supabase backend');
        
        // Import Supabase client
        const { getSupabaseClient } = await import('../../utils/supabase/client');
        const supabase = getSupabaseClient();
        
        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AppProvider: Error getting session:', error);
        }
        
        if (session?.user) {
          console.log('AppProvider: Found existing session for user:', session.user.email);
          
          // Load user profile from database (profiles table)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            // ✅ Para empresas, buscar nome da tabela companies
            let displayName = profile.name || profile.full_name || session.user.email || 'Usuário';
            let companyName = profile.company_name;
            let avatarUrl = profile.avatar_url;
            
            if (profile.user_type === 'transportadora' || profile.user_type === 'embarcador' || profile.user_type === 'agenciador') {
              // Buscar dados da empresa
              const { data: company } = await supabase
                .from('companies')
                .select('trading_name, company_name, logo_url')
                .eq('user_id', session.user.id)
                .single();
              
              if (company) {
                displayName = company.trading_name || company.company_name || displayName;
                companyName = company.trading_name || company.company_name;
                avatarUrl = company.logo_url || avatarUrl;
                
                // ✅ AUTO-SINCRONIZAÇÃO: Se profiles.name está diferente de companies.trading_name, corrigir automaticamente
                if (profile.name !== displayName) {
                  console.log('🔄 [AppContext] Detectada inconsistência de dados:');
                  console.log('   profiles.name:', profile.name);
                  console.log('   companies.trading_name:', displayName);
                  console.log('   → Sincronizando automaticamente...');
                  
                  // Atualizar profiles.name para manter sincronizado
                  const { error: syncError } = await supabase
                    .from('profiles')
                    .update({
                      name: displayName,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', session.user.id);
                  
                  if (syncError) {
                    console.error('❌ [AppContext] Erro ao sincronizar profiles:', syncError);
                  } else {
                    console.log('✅ [AppContext] profiles.name sincronizado com sucesso!');
                  }
                }
              }
            }
            
            const user: User = {
              id: session.user.id, // SEMPRE usar o UUID do Supabase Auth, não o profile.id
              name: displayName,
              email: session.user.email || '',
              userType: profile.user_type,
              verified: profile.email_verified || false,
              rating: profile.rating || 0,
              totalTrips: profile.total_trips || 0,
              level: profile.level || 1,
              totalXP: profile.total_xp || 0,
              avatar: avatarUrl,
              location: profile.location || '',
              phone: profile.phone || '',
              company: companyName,
              createdAt: profile.created_at,
              preferences: {
                notifications: true,
                darkMode: false,
                language: 'pt',
                autoLocation: true
              }
            };
            
            dispatch({ type: 'SET_USER', payload: user });
            console.log('AppProvider: User loaded successfully with Supabase Auth ID:', session.user.id);
            
            // ✅ CARREGAR NOTIFICAÇÕES INICIAIS
            try {
              const { database } = await import('../../utils/database');
              const notificationsResponse = await database.notifications.getByUser(session.user.id, {
                limit: 50,
                offset: 0
              });
              
              if (notificationsResponse.success && notificationsResponse.data) {
                dispatch({ 
                  type: 'SET_NOTIFICATIONS', 
                  payload: notificationsResponse.data.map(n => ({
                    id: n.id,
                    type: n.type as any,
                    title: n.title,
                    message: n.message,
                    timestamp: n.createdAt,
                    read: n.is_read || false,
                    data: n.metadata
                  }))
                });
                console.log('✅ [AppContext] Notificações carregadas:', notificationsResponse.data.length);
              }
            } catch (error) {
              console.error('❌ [AppContext] Erro ao carregar notificações:', error);
            }
          }
        } else {
          console.log('AppProvider: No active session found');
        }
        
        // Set connection status to online
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'online' });
        dispatch({ type: 'UPDATE_LAST_SYNC', payload: new Date().toISOString() });
        dispatch({ type: 'SET_LOADING', payload: false });

        console.log('AppProvider: Backend connection established');

      } catch (error) {
        console.error('AppProvider: Error initializing app:', error);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'offline' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeApp();
  }, []);

  // ✅ SUPABASE REALTIME: Escutar notificações em tempo real (centralizado)
  useEffect(() => {
    // ✅ REABILITADO: Realtime funcionando após correção do schema no Supabase
    // Trigger corrigido para usar 'profiles' em vez de 'users'
    const ENABLE_REALTIME_NOTIFICATIONS = true;
    
    if (!state.user || !ENABLE_REALTIME_NOTIFICATIONS) return; // Só ativa se tiver usuário logado E flag habilitada

    const setupRealtimeNotifications = async () => {
      try {
        const { getSupabaseClient } = await import('../../utils/supabase/client');
        const { database } = await import('../../utils/database');
        const supabase = getSupabaseClient();

        console.log('🔔 [AppContext] Iniciando Realtime para notificações do usuário:', state.user.id);

        // Criar canal de Realtime
        let reconnectTimeout: NodeJS.Timeout | null = null;
        let isUnmounted = false;
        
        const setupChannel = () => {
          if (isUnmounted) return null;
          
          const channel = supabase
            .channel(`notifications-${state.user.id}`, {
              config: {
                broadcast: { self: false },
                presence: { key: state.user.id }
              }
            })
            .on(
              'postgres_changes',
              {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${state.user.id}`
              },
              async (payload) => {
                console.log('🔔 [AppContext] Notificação em tempo real:', payload);

                // Recarregar todas as notificações do usuário
                const response = await database.notifications.getByUser(state.user!.id);
                
                if (response.success && response.data) {
                  // Atualizar estado global com todas as notificações
                  dispatch({ 
                    type: 'SET_NOTIFICATIONS', 
                    payload: response.data.map(n => ({
                      id: n.id,
                      type: n.type as any,
                      title: n.title,
                      message: n.message,
                      timestamp: n.createdAt,
                      read: n.is_read || false,
                      data: n.metadata
                    }))
                  });

                  // Mostrar toast apenas para novas notificações (INSERT)
                  if (payload.eventType === 'INSERT') {
                    const notification = payload.new as any;
                    toast.info(notification.title, {
                      description: notification.message,
                      duration: 5000
                    });
                  }
                }
              }
            )
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                if (reconnectTimeout) {
                  clearTimeout(reconnectTimeout);
                  reconnectTimeout = null;
                }
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                if (!isUnmounted && !reconnectTimeout) {
                  reconnectTimeout = setTimeout(() => {
                    reconnectTimeout = null;
                    supabase.removeChannel(channel);
                    setupChannel();
                  }, 5000);
                }
              } else if (status === 'CLOSED') {
                // Canal fechado é normal durante navegação - não reconectar
              }
            });
          
          return channel;
        };
        
        const channel = setupChannel();

        // Cleanup: Cancelar subscription ao desmontar ou trocar usuário
        return () => {
          isUnmounted = true;
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
          if (channel) {
            try {
              supabase.removeChannel(channel);
            } catch (e) {
              // Ignorar
            }
          }
        };
      } catch (error) {
        console.error('❌ [AppContext] Erro ao configurar Realtime:', error);
      }
    };

    const cleanup = setupRealtimeNotifications();
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [state.user?.id]);

  // ✅ Listener para eventos de notificação do hook global (localStorage)
  useEffect(() => {
    console.log('🎯 [AppContext] Listener de notificações - state.user:', state.user?.id || 'UNDEFINED');
    
    if (!state.user) return;

    const handleNotificationCreated = async (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔔 [AppContext] Evento de notificação detectado:', customEvent.detail);
      
      // Recarregar notificações do localStorage
      try {
        const { database } = await import('../../utils/database');
        const response = await database.notifications.getByUser(state.user!.id);
        
        if (response.success && response.data) {
          const notificationsWithTimestamp = response.data.map(n => ({
            id: n.id,
            type: n.type as any,
            title: n.title,
            message: n.message,
            timestamp: n.createdAt,
            read: n.is_read || false,
            data: n.metadata
          }));
          
          console.log('🔄 [AppContext] Notificações recarregadas:', notificationsWithTimestamp.length);
          
          dispatch({ 
            type: 'SET_NOTIFICATIONS', 
            payload: [...notificationsWithTimestamp] // Force new array reference
          });
          
          console.log('✅ [AppContext] Estado atualizado com', notificationsWithTimestamp.length, 'notificações');
        } else {
          console.log('⚠️ [AppContext] Nenhuma notificação encontrada');
        }
      } catch (error) {
        console.error('❌ [AppContext] Erro ao recarregar notificações:', error);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('notification-created', handleNotificationCreated);
      console.log('👂 [AppContext] Escutando eventos de notificação para user:', state.user.id);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('notification-created', handleNotificationCreated);
        console.log('🔇 [AppContext] Removendo listener de notificações');
      }
    };
  }, [state.user?.id]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('AppProvider: Connection restored');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'online' });
    };
    
    const handleOffline = () => {
      console.log('AppProvider: Connection lost');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'offline' });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Dark mode persistence
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('maisfrete-dark-mode');
    if (savedDarkMode === 'true') {
      dispatch({ type: 'TOGGLE_DARK_MODE' });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('maisfrete-dark-mode', state.darkMode.toString());
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  const actions = useMemo(() => ({
    dispatch, // Expor dispatch para uso direto quando necessário
    setUser: (user: User) => dispatch({ type: 'SET_USER', payload: user }),
    
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => {
      const newNotification: Notification = {
        ...notification,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString()
      };
      dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
      
      // Show toast notification
      toast(notification.title, {
        description: notification.message,
        action: notification.actions?.[0] ? {
          label: notification.actions[0].label,
          onClick: () => console.log('Action clicked:', notification.actions?.[0].action)
        } : undefined
      });
    },

    markNotificationRead: (id: string) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id }),

    addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => {
      const newActivity: Activity = {
        ...activity,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString()
      };
      dispatch({ type: 'ADD_ACTIVITY', payload: newActivity });
    },

    updateStats: (stats: Partial<AppStats>) => dispatch({ type: 'UPDATE_STATS', payload: stats }),
    
    toggleFavorite: (id: string) => {
      dispatch({ type: 'TOGGLE_FAVORITE', payload: id });
      const isFavorite = state.favorites.includes(id);
      const message = isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos';
      toast(message);
    },

    addSearch: (query: string) => {
      if (query.trim()) {
        dispatch({ type: 'ADD_SEARCH', payload: query.trim() });
      }
    },

    setActiveScreen: (screen: string) => dispatch({ type: 'SET_ACTIVE_SCREEN', payload: screen }),

    logout: async () => {
      try {
        // Import Supabase client
        const { getSupabaseClient } = await import('../../utils/supabase/client');
        const supabase = getSupabaseClient();
        
        // Sign out from Supabase
        await supabase.auth.signOut();
        
        dispatch({ type: 'LOGOUT' });
        localStorage.removeItem('maisfrete-auth-token');
        toast('Logout realizado com sucesso');
      } catch (error) {
        console.error('Error during logout:', error);
        dispatch({ type: 'LOGOUT' });
        toast('Logout realizado');
      }
    }
  }), [state.favorites]);

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}