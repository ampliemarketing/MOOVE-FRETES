import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { useApp } from './contexts/AppContext';
import { toast } from 'sonner@2.0.3';
import type { User, UserType } from './contexts/AppContext';
import { getAvatarUrl } from '../utils/storage-helper'; // ✅ IMPORTAR HELPER
import { MyPreferredRoutes } from './MyPreferredRoutes';
import { AddPreferredRoute } from './AddPreferredRoute';
import { AutoSyncWrapper } from './AutoSyncWrapper';
import { ConnectionStatusIndicator } from './OfflineModeBanner';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { 
  Menu, 
  X, 
  Home, 
  Package, 
  Clock, 
  MapPin, 
  Users, 
  MessageSquare, 
  Heart, 
  User as UserIcon,
  Bell, 
  Search, 
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
  Shield,
  Palette,
  HelpCircle,
  FileText,
  TrendingUp,
  Calculator,
  DollarSign,
  Plus,
  BarChart3,
  Navigation,
  Award
} from 'lucide-react';
import { AllDriversScreen } from './AllDriversScreen';
import { PublishedRoutesScreen } from './PublishedRoutesScreen';
// FavoritesScreen removido - favoritos agora são filtro no DriversScreen
import { FreightManagement } from './FreightManagement';
import { MyFreightsScreen } from './MyFreightsScreen';
import { AllFreightsScreen } from './AllFreightsScreen';
import { FreightHistory } from './FreightHistory';
import { TransactionScreen } from './TransactionScreen';
import { CompaniesScreen } from './CompaniesScreen';
import { ChatScreen } from './ChatScreen';
import { SocialFeed } from './SocialFeed';
import { ProfileScreen } from './ProfileScreen';
import { SystemSettings } from './SystemSettings';
import { CollaboratorManagement } from './CollaboratorManagement';
import { ActivityLogsScreen } from './ActivityLogsScreen';
import { NotificationScreen } from './NotificationScreen';
import { database } from '../utils/database';
import { getSupabaseClient } from '../utils/supabase/client';
import logoMaisFrete from '../assets/logo-moovefretes.png';
import { getTabForDeepLink, parseDeepLinkFromUrl, type DeepLink, type DeepLinkType } from '../utils/deep-link';
import { PageHelpModal } from './PageHelpModal';

interface MainDashboardProps {
  user: User;
  onLogout: () => void;
  initialDeepLink?: DeepLink | null;
  onDeepLinkConsumed?: () => void;
}

// Dashboard stats interface
interface DashboardStats {
  activeFreights: number;
  connectedDrivers: number;
  monthlyRevenue: number;
  loading: boolean;
}

export function MainDashboard({ user: initialUser, onLogout, initialDeepLink, onDeepLinkConsumed }: MainDashboardProps) {
  // Usar usuário do contexto global (atualiza em tempo real) ou prop inicial
  const { state } = useApp();
  
  // 🔥 FORÇAR RE-RENDER quando perfil for atualizado
  const [updateTrigger, forceUpdate] = useReducer((x) => x + 1, 0);
  
  // 🔥 RECALCULAR user a cada re-render (reativo ao AppContext)
  const user = useMemo(() => {
    return state.user || initialUser;
  }, [state.user, initialUser, updateTrigger]); // Depende de updateTrigger para forçar recálculo
  
  // ✅ CONVERTER avatar PATH → URL dinamicamente
  const userAvatarUrl = useMemo(() => getAvatarUrl(user.avatar), [user.avatar]);
  
  // ✅ Resolver companyId: se for colaborador, usar o companyId da empresa vinculada
  const resolvedCompanyId = user.collaborator?.companyId || user.id;
  const isCollaborator = !!user.collaborator;
  
  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      forceUpdate(); // Incrementa updateTrigger, forçando recálculo do useMemo acima
    };
    
    window.addEventListener('user-profile-updated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
    };
  }, []);
  
  // Motoristas iniciam na tela de Fretes, outros usuários no Início
  const [activeTab, setActiveTab] = useState(user.userType === 'caminhoneiro' ? 'all-freights' : 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedFreightForChat, setSelectedFreightForChat] = useState<string | null>(null);
  const [initialChatMessage, setInitialChatMessage] = useState<string | null>(null);
  const [selectedFreightForQuote, setSelectedFreightForQuote] = useState<string | null>(null);
  const [shouldOpenFreightForm, setShouldOpenFreightForm] = useState(false);
  const [isFreightMenuExpanded, setIsFreightMenuExpanded] = useState(false);
  const [isDriversMenuExpanded, setIsDriversMenuExpanded] = useState(false);
  const [selectedUserForChat, setSelectedUserForChat] = useState<string | null>(null); // Novo estado para chat direto com usuário
  const [showAddRouteForm, setShowAddRouteForm] = useState(false); // Estado para controlar formulário de adicionar rota

  // 🔗 Deep link state
  const [deepLinkEntityId, setDeepLinkEntityId] = useState<string | null>(null);
  const [deepLinkEntityType, setDeepLinkEntityType] = useState<string | null>(null);

  // 🔗 Handle deep link navigation on mount
  useEffect(() => {
    if (initialDeepLink) {
      const { tab, entityId, entityType } = getTabForDeepLink(initialDeepLink);
      
      setDeepLinkEntityId(entityId);
      setDeepLinkEntityType(entityType);
      
      // Navigate to the correct tab
      if (entityType === 'freight') {
        setSelectedFreightForQuote(entityId);
        setActiveTab('all-freights');
      } else if (entityType === 'company') {
        setActiveTab('companies');
      } else {
        setActiveTab(tab);
      }
      
      // Notify parent that deep link was consumed
      onDeepLinkConsumed?.();
    }
  }, [initialDeepLink]);

  // 🔗 Handle in-app deep link navigation (from chat links, etc.)
  const handleDeepLinkNavigation = (deepLink: DeepLink) => {
    const { tab, entityId, entityType } = getTabForDeepLink(deepLink);
    
    setDeepLinkEntityId(entityId);
    setDeepLinkEntityType(entityType);
    
    if (entityType === 'freight') {
      setSelectedFreightForQuote(entityId);
      setActiveTab('all-freights');
    } else if (entityType === 'company') {
      setActiveTab('companies');
    } else if (entityType === 'chat') {
      setSelectedUserForChat(entityId);
      setActiveTab('chat');
    } else if (entityType === 'profile') {
      // Profile deep links: navegar para all-drivers com o ID
      setActiveTab('all-drivers');
    } else {
      setActiveTab(tab);
    }
  };

  // 🔗 Expose deep link handler globally for ChatMessageItem to use
  // Usando ref para evitar stale closure - o handler sempre aponta para a versão mais atual
  const handleDeepLinkNavigationRef = React.useRef(handleDeepLinkNavigation);
  handleDeepLinkNavigationRef.current = handleDeepLinkNavigation;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any)._handleDeepLinkNavigation = (deepLink: DeepLink) => {
        handleDeepLinkNavigationRef.current(deepLink);
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any)._handleDeepLinkNavigation;
      }
    };
  }, []);

  // Função para navegar para uma nova aba, guardando a anterior
  const navigateToTab = (newTab: string) => {
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };
  
  // Dashboard stats state
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    activeFreights: 0,
    connectedDrivers: 0,
    monthlyRevenue: 0,
    loading: true,
  });
  
  // Recent activity from notifications
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Sincronizar atividades recentes com o estado global do AppContext
  useEffect(() => {
    if (state.notifications && state.notifications.length > 0) {
      const recent = state.notifications.slice(0, 4); // 4 mais recentes
      setRecentActivity(recent);
      setActivityLoading(false); // ✅ Marca como carregado quando recebe do estado global
    }
  }, [state.notifications]);

  // Load dashboard stats on mount
  useEffect(() => {
    loadDashboardStats();
    loadRecentActivity(); // Carrega inicialmente
  }, [resolvedCompanyId]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnlineStatusChange = () => {
      if (navigator.onLine) {
        toast.success('Conexão restabelecida!');
      } else {
        toast.error('Você está offline!');
      }
    };

    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, []);

  const loadRecentActivity = async () => {
    try {
      setActivityLoading(true);
      
      // ✅ OTIMIZAÇÃO: Buscar apenas 4 notificações mais recentes (com paginação)
      const response = await database.notifications.getByUser(resolvedCompanyId, {
        limit: 4,
        offset: 0
      });
      
      const notifications = response.data || [];
      setRecentActivity(notifications);
      
    } catch (error) {
      console.error('❌ Erro ao carregar atividade recente:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setDashboardStats(prev => ({ ...prev, loading: true }));

      // Load freights
      const freightsResponse = await database.freights.getAll();
      const freightsRaw = freightsResponse.data || [];
      
      // 🔒 Filtrar fretes pausados/inativos - eles não devem aparecer no dashboard público
      const freights = freightsRaw.filter((f: any) => f.status !== 'inactive');
      
      // ✅ FRETES ATIVOS: Todos os fretes do usuário que aparecem em "Meus Fretes"
      // Exclui apenas: cancelados e inativos (pausados)
      const activeFreights = freights.filter((f: any) => 
        f.customerId === resolvedCompanyId && // Fretes da empresa (ou do próprio usuário)
        f.status !== 'cancelled' && // Não cancelados
        f.status !== 'inactive' // Não pausados
      ).length;

      // ✅ MOTORISTAS CONECTADOS: Total de motoristas cadastrados e ativos no sistema
      let connectedDrivers = 0;
      
      try {
        // Buscar motoristas do Supabase (mesma lógica da tela de motoristas)
        const supabase = getSupabaseClient();
        
        // Buscar da tabela drivers (mesma query do useAvailableDrivers)
        const { data: driversData, error } = await supabase
          .from('drivers')
          .select('*');
        
        if (error) {
          console.error('❌ Erro ao buscar motoristas:', error);
        } else {
          connectedDrivers = driversData?.length || 0;
        }
      } catch (error) {
        console.error('❌ Erro ao contar motoristas:', error);
        // Se falhar, tenta do repository como fallback
        const driversResponse = await database.drivers.getAll();
        const allDrivers = driversResponse.data || [];
        connectedDrivers = allDrivers.length;
      }
      
      // Receita mensal: placeholder até integração com módulo financeiro
      const monthlyRevenue = 0;

      setDashboardStats({
        activeFreights,
        connectedDrivers,
        monthlyRevenue,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setDashboardStats(prev => ({ ...prev, loading: false }));
      toast.error('Erro ao carregar estatísticas do dashboard');
    }
  };

  const handleLogout = () => {
    toast.success('Logout realizado com sucesso!');
    onLogout();
  };

  const handleOpenChat = (userId: string, userName: string, prefilledMessage?: string) => {
    // [REVISAR] console.log('💬 [MainDashboard] handleOpenChat chamado!', {
    // userId,
    // userName,
    // hasPrefilledMessage: !!prefilledMessage,
    // messagePreview: prefilledMessage ? prefilledMessage.substring(0, 100) + '...' : null,
    // });
    
    // Abrir chat diretamente com um usuário específico
    setSelectedFreightForChat(null); // Limpar frete selecionado
    setInitialChatMessage(prefilledMessage || null); // Definir mensagem pré-pronta se fornecida
    setSelectedUserForChat(userId); // Novo estado para chat direto com usuário
    setActiveTab('chat');
    toast.success(`Abrindo chat com ${userName}`);
  };

  const handleNavigateToChat = (freightId: string, freightData?: any) => {
    // 🔍 DEBUG: Log dos dados recebidos

    // Abrir chat com o publisher do frete
    if (freightData?.customerId) {
      // 📝 Criar mensagem automática com detalhes do frete
      const origin = typeof freightData.origin === 'string' 
        ? freightData.origin 
        : `${freightData.origin?.city}, ${freightData.origin?.state}`;
      
      const destination = typeof freightData.destination === 'string' 
        ? freightData.destination 
        : `${freightData.destination?.city}, ${freightData.destination?.state}`;
      
      const cargo = typeof freightData.cargo === 'string'
        ? freightData.cargo
        : freightData.cargo?.description || freightData.cargo?.type || 'Não especificado';
      
      const autoMessage = `Olá! Tenho interesse no frete:\n\n` +
        `📦 Frete #${freightData.freight_code || freightData.id?.substring(0, 8)}\n` +
        `📍 Origem: ${origin}\n` +
        `📍 Destino: ${destination}\n` +
        `📦 Carga: ${cargo}\n` +
        `⚖️ Peso: ${freightData.weight || 'Não especificado'}\n` +
        `🚛 Tipo de Caminhão: ${freightData.truckType || 'Não especificado'}\n` +
        `💰 Valor: ${freightData.price || 'Não especificado'}\n\n` +
        `Gostaria de mais informações sobre este frete.`;

      setSelectedUserForChat(freightData.customerId);
      setSelectedFreightForChat(freightId);
      setInitialChatMessage(autoMessage);
      setActiveTab('chat');
      toast.success(`Abrindo chat com ${freightData.customerName || 'empresa'}`);
      
      // [REVISAR] console.log('✅ [handleNavigateToChat] Chat aberto com:', {
      // userId: freightData.customerId,
      // userName: freightData.customerName,
      // hasAutoMessage: true,
      // messagePreview: autoMessage.substring(0, 50) + '...'
      // });
    } else {
      console.error('❌ [handleNavigateToChat] customerId não encontrado:', freightData);
      toast.error('Não foi possível abrir o chat - dados do frete incompletos');
    }
  };

  const handleNavigateToQuote = (freightId: string) => {
    setSelectedFreightForQuote(freightId);
    setActiveTab('freight-management');
    toast.success('Preparando cotação para este frete');
  };

  const handleViewFreight = (freightId: string) => {
    setSelectedFreightForQuote(freightId);
    setActiveTab('all-freights');
    toast.success('Abrindo detalhes do frete');
  };

  // Limpar estados de navegação quando mudar de aba
  useEffect(() => {
    if (activeTab !== 'chat') {
      setSelectedFreightForChat(null);
      setInitialChatMessage(null);
      setSelectedUserForChat(null); // Limpar usuário selecionado para chat
    }
    if (activeTab !== 'freight-management' && activeTab !== 'all-freights') {
      setSelectedFreightForQuote(null);
    }
    // 🔗 Limpar deep link entity após consumir, para evitar re-trigger
    // Delay para permitir que o componente filho receba o ID antes de limpar
    const timer = setTimeout(() => {
      setDeepLinkEntityId(null);
      setDeepLinkEntityType(null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const menuItems = [
    // Início apenas para transportadoras, embarcadores e agenciadores
    ...(user.userType !== 'caminhoneiro' ? [
      { id: 'dashboard', label: 'Início', icon: Home },
    ] : []),
    { id: 'freight-management', label: user.userType === 'caminhoneiro' ? 'Fretes' : 'Gestão de Fretes', icon: Package },
    // Sub-itens de Gestão de Fretes (para que o título funcione corretamente)
    ...(user.userType !== 'caminhoneiro' ? [
      { id: 'my-freights', label: 'Meus Fretes', icon: Package },
    ] : []),
    { id: 'all-freights', label: user.userType === 'caminhoneiro' ? 'Fretes' : 'Todos os Fretes', icon: Package },
    ...(user.userType === 'caminhoneiro' ? [
      { id: 'preferred-routes', label: 'Rotas de Interesse', icon: MapPin }
    ] : []),
    // Histórico apenas para transportadoras, embarcadores e agenciadores
    ...(user.userType !== 'caminhoneiro' ? [
      { id: 'history', label: 'Histórico', icon: Clock },
    ] : []),
    { 
      id: 'drivers', 
      label: user.userType === 'caminhoneiro' ? 'Transportadoras' : 'Motoristas', 
      icon: Users 
    },
    // Sub-itens de Motoristas (para que o título funcione corretamente)
    { id: 'all-drivers', label: 'Todos os Motoristas', icon: Users },
    { id: 'published-routes', label: 'Rotas Publicadas', icon: Navigation },
    { id: 'chat', label: 'Chat', icon: MessageSquare }
    // { id: 'social', label: 'Rede Social', icon: Heart } // temporariamente removido
  ];



  const renderContent = () => {
    // console.log('🖥️ [MainDashboard] Renderizando conteúdo para activeTab:', activeTab);
    
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6 px-[21px] py-[0px]">
            {/* Welcome Section */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-[0px] p-6 sm:p-8 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    Bem-vindo, {user.name && !user.name.includes('@') ? user.name : user.email?.split('@')[0] || 'Usuário'}! 👋
                  </h2>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1">
                  <span className="text-sm text-white/80">
                    {new Date().toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                  <span className="text-sm text-white/80">
                    {new Date().toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="border-0 shadow-card hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Fretes Ativos</p>
                      <h3 className="text-3xl font-semibold mb-2">{dashboardStats.activeFreights}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Motoristas Conectados</p>
                      <h3 className="text-3xl font-semibold mb-2">{dashboardStats.connectedDrivers}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Receita Mensal</p>
                      <h3 className="text-3xl font-semibold mb-2">
                        {dashboardStats.monthlyRevenue > 0 
                          ? `R$ ${(dashboardStats.monthlyRevenue / 1000).toFixed(2).replace('.', ',')}k`
                          : 'R$ 0,00'}
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <DollarSign className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-0 shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ações Rápidas</CardTitle>
                    <CardDescription className="mt-1">
                      Acesse rapidamente as funcionalidades mais utilizadas
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.userType !== 'caminhoneiro' && (
                    <button
                      onClick={() => {
                        setShouldOpenFreightForm(true);
                        setActiveTab('freight-management');
                      }}
                      className="group relative overflow-hidden rounded-xl border-2 border-primary bg-primary/5 p-6 text-left transition-all duration-300 hover:bg-[#e9742b] hover:border-[#e9742b] hover:shadow-lg hover:scale-[1.02]"
                    >
                      <div className="relative z-10">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm transition-all duration-300 group-hover:bg-white">
                          <Plus className="h-6 w-6 text-white transition-colors duration-300 group-hover:text-[#e9742b]" />
                        </div>
                        <h3 className="font-medium mb-1 text-foreground transition-colors duration-300 group-hover:text-white">
                          Criar Frete
                        </h3>
                        <p className="text-sm text-muted-foreground transition-colors duration-300 group-hover:text-white/90">
                          Crie um novo frete agora
                        </p>
                      </div>
                    </button>
                  )}
                  
                  <button
                    onClick={() => setActiveTab('drivers')}
                    className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-left transition-all duration-300 hover:border-primary hover:shadow-lg"
                  >
                    <div className="relative z-10">
                      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 group-hover:bg-primary/10 transition-colors">
                        <Users className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="font-semibold mb-1">
                        Buscar Motoristas
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Encontre motoristas disponíveis
                      </p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-left transition-all duration-300 hover:border-primary hover:shadow-lg"
                  >
                    <div className="relative z-10">
                      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 group-hover:bg-primary/10 transition-colors">
                        <MessageSquare className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="font-semibold mb-1">
                        Mensagens
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Acesse o chat
                      </p>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-0 shadow-card">
              <CardHeader className="pb-4">
                <CardTitle>Atividade Recente</CardTitle>
                <CardDescription>Últimas movimentações da sua conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                {activityLoading ? (
                  // ✅ Loading skeleton
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-start gap-4 p-3 rounded-lg animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Calculator className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium mb-1">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {(() => {
                              // ✅ Usar 'timestamp' em vez de 'createdAt'
                              const dateStr = activity.timestamp || activity.createdAt;
                              if (!dateStr) return 'Data não disponível';
                              
                              try {
                                const date = new Date(dateStr);
                                if (isNaN(date.getTime())) return 'Data inválida';
                                
                                return formatDistanceToNow(date, { locale: ptBR, addSuffix: true });
                              } catch (error) {
                                return 'Data inválida';
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <p className="text-center text-muted-foreground py-6">
                        Nenhuma atividade recente
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'freight-management':
        return (
          <FreightManagement 
            user={user} 
            initialTab={activeTab === 'freight-registration' ? 'create' : 'list'} 
            initialFreightForQuote={selectedFreightForQuote}
            shouldOpenFreightForm={shouldOpenFreightForm}
            setShouldOpenFreightForm={setShouldOpenFreightForm}
            initialView={activeTab === 'my-freights' ? 'my-freights' : activeTab === 'all-freights' ? 'all-freights' : undefined}
            onOpenChat={handleOpenChat}
            onNavigateToChat={handleNavigateToChat}
          />
        );
      
      case 'freight-registration':
        return (
          <FreightManagement 
            user={user} 
            initialTab="create"
            initialFreightForQuote={selectedFreightForQuote}
            shouldOpenFreightForm={true}
            setShouldOpenFreightForm={setShouldOpenFreightForm}
            initialView="my-freights"
            onOpenChat={handleOpenChat}
            onNavigateToChat={handleNavigateToChat}
          />
        );

      case 'my-freights':
        return <MyFreightsScreen user={user} onOpenChat={handleOpenChat} />;
        
      case 'all-freights':
        return <AllFreightsScreen user={user} onOpenChat={handleOpenChat} onNavigateToChat={handleNavigateToChat} selectedFreightId={selectedFreightForQuote} />;
        
      case 'history':
        return <FreightHistory user={user} />;

      case 'transaction':
        return <TransactionScreen user={user} />;

      case 'drivers':
      case 'all-drivers':
        // Motoristas veem empresas (CompaniesScreen), outros veem motoristas (DriversScreen)
        return user.userType === 'caminhoneiro' 
          ? <CompaniesScreen user={user} onOpenChat={handleOpenChat} onViewFreight={handleViewFreight} initialSelectedId={deepLinkEntityType === 'company' ? deepLinkEntityId : undefined} />
          : <AllDriversScreen user={user} onOpenChat={handleOpenChat} initialSelectedId={deepLinkEntityType === 'driver' ? deepLinkEntityId : undefined} />;

      case 'companies':
        return <CompaniesScreen user={user} onOpenChat={handleOpenChat} onViewFreight={handleViewFreight} initialSelectedId={deepLinkEntityType === 'company' ? deepLinkEntityId : undefined} />;

      case 'preferred-routes':
        // Se showAddRouteForm está ativo, mostrar formulário
        if (showAddRouteForm) {
          return (
            <AddPreferredRoute 
              user={user} 
              onBack={() => setShowAddRouteForm(false)}
              onSuccess={() => {
                setShowAddRouteForm(false);
                toast.success('Rota adicionada com sucesso!');
              }}
            />
          );
        }
        // Caso contrário, mostrar lista de rotas
        return <MyPreferredRoutes user={user} onAddRoute={() => setShowAddRouteForm(true)} />;
        
      case 'published-routes':
        // Motoristas veem suas próprias rotas publicadas, outros veem rotas de motoristas
        return user.userType === 'caminhoneiro'
          ? <MyPreferredRoutes user={user} viewMode="public" />
          : <PublishedRoutesScreen user={user} onOpenChat={handleOpenChat} />;

        
      case 'chat':
        return (
          <ChatScreen 
            user={user} 
            initialFreightId={selectedFreightForChat}
            initialMessage={initialChatMessage || undefined}
            initialUserId={selectedUserForChat}
            companyId={isCollaborator ? resolvedCompanyId : undefined}
          />
        );

      case 'social':
        return <SocialFeed user={user} />;

      case 'profile':
        return <ProfileScreen user={user} onLogout={onLogout} isCollaborator={isCollaborator} companyId={isCollaborator ? resolvedCompanyId : undefined} companyName={user.collaborator?.companyName} />;

      case 'settings':
        return <SystemSettings user={user} onBack={() => setActiveTab('dashboard')} />;

      case 'collaborators':
        return <CollaboratorManagement user={user} companyId={resolvedCompanyId} />;

      case 'activity-logs':
        return <ActivityLogsScreen user={user} companyId={resolvedCompanyId} onBack={() => setActiveTab('dashboard')} />;

      default:
        return <div>Tela em desenvolvimento...</div>;
    }
  };

  return (
    <AutoSyncWrapper userId={user.id}>
      <div className="flex flex-col h-screen bg-background">
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 z-30 relative">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            {/* Logo no mobile e desktop */}
            <div className="flex items-center">
              <img 
                src={logoMaisFrete} 
                alt="MaisFrete" 
                className="h-8 w-auto object-contain"
              />
            </div>
            
            {/* Título da aba ativa com ícone - visível no mobile */}
            <div className="flex items-center gap-2 lg:ml-4">
              {(() => {
                const currentItem = menuItems.find(item => item.id === activeTab);
                if (!currentItem) return null;
                const Icon = currentItem.icon;
                return (
                  <>
                    <Icon className="w-5 h-5 text-primary" />
                    <h1 className="font-medium">{currentItem.label}</h1>
                    <PageHelpModal pageId={activeTab} />
                  </>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => setShowNotifications(true)}
            >
              <Bell className="w-5 h-5" />
              {state.notifications && state.notifications.filter(n => !n.read).length > 0 && (
                <Badge className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4">
                  {state.notifications.filter(n => !n.read).length}
                </Badge>
              )}
            </Button>

            {/* User Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 px-3 hover:bg-primary/5 transition-colors duration-200 rounded-lg [&:hover]:text-foreground"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={userAvatarUrl || undefined} />
                    <AvatarFallback className="bg-[#e9742b] text-white">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-0 shadow-xl border-0">
                {/* Header com informações do usuário */}
                <div className="bg-gradient-to-br from-primary to-primary/90 p-6 rounded-t-lg">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-14 h-14 border-2 border-white shadow-md">
                      <AvatarImage src={userAvatarUrl || undefined} />
                      <AvatarFallback className="bg-white text-primary text-lg font-semibold">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-base mb-1 truncate">
                        {user.name}
                      </p>
                      <p className="text-white/80 text-xs mb-3 truncate">
                        {user.email}
                      </p>
                      <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs font-medium">
                        {user.userType === 'caminhoneiro' ? 'Caminhoneiro' : 
                         user.userType === 'transportadora' ? 'Transportadora' : 
                         user.userType === 'embarcador' ? 'Embarcador' : 
                         user.userType === 'collaborator' ? 'Colaborador' : 'Agenciador'}
                      </Badge>
                      {isCollaborator && user.collaborator && (
                        <div className="mt-2 text-white/70 text-xs">
                          Atuando como: <span className="text-white/90">{user.collaborator.companyName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Menu Items */}
                <div className="py-2">
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('profile')}
                    className="mx-2 rounded-lg px-3 py-2.5 cursor-pointer"
                  >
                    <UserIcon className="mr-3 h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Meu Perfil</span>
                  </DropdownMenuItem>
                  
                  {/* Colaboradores - apenas para transportadoras */}
                  {(user.userType === 'transportadora' || user.userType === 'agenciador') && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => setActiveTab('collaborators')}
                        className="mx-2 rounded-lg px-3 py-2.5 cursor-pointer"
                      >
                        <Users className="mr-3 h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Colaboradores</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={() => setActiveTab('activity-logs')}
                        className="mx-2 rounded-lg px-3 py-2.5 cursor-pointer"
                      >
                        <FileText className="mr-3 h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Logs de Atividades</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </div>
                
                <DropdownMenuSeparator className="my-1" />
                
                {/* Help Section */}
                <div className="py-2">
                  <DropdownMenuItem className="mx-2 rounded-lg px-3 py-2.5 cursor-pointer">
                    <HelpCircle className="mr-3 h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Ajuda & Suporte</span>
                  </DropdownMenuItem>
                </div>
                
                <DropdownMenuSeparator className="my-1" />
                
                {/* Logout Section */}
                <div className="p-2">
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="mx-1 rounded-lg px-3 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 cursor-pointer font-medium"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="text-sm">Sair</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Melhorado */}
        <div className={`hidden lg:flex lg:flex-col ${isDesktopSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'} lg:bg-white lg:border-r lg:border-gray-200 lg:shadow-sm transition-all duration-300`}>
          {/* Logo Header */}
          <div className={`flex items-center justify-center transition-all duration-300`}>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex ml-auto mr-2"
              onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            >
              <Menu className={`w-5 h-5 transition-transform duration-300 ${isDesktopSidebarCollapsed ? 'rotate-90' : ''}`} />
            </Button>
          </div>
          
          {/* Navigation Menu */}
          <nav className={`flex-1 p-4 space-y-1 overflow-y-auto ${isDesktopSidebarCollapsed ? 'px-2' : 'px-4'}`}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isFreightMenu = item.id === 'freight-management';
              const isDriversMenu = item.id === 'drivers';
              const isFreightSubItemActive = activeTab === 'my-freights' || activeTab === 'all-freights' || activeTab === 'freight-registration';
              const isDriversSubItemActive = activeTab === 'all-drivers' || activeTab === 'published-routes';
              
              // Pular sub-itens que aparecem dentro de menus expansíveis
              const subItemsToSkip = ['my-freights', 'all-freights', 'all-drivers', 'published-routes'];
              if (subItemsToSkip.includes(item.id)) {
                return null;
              }
              
              // Se sidebar estiver colapsada, mostrar apenas ícone
              if (isDesktopSidebarCollapsed) {
                 return (
                   <button
                     key={item.id}
                     onClick={() => {
                       if (isFreightMenu || isDriversMenu) {
                         // Se clicar em menu expansível, expande a sidebar e o menu
                         setIsDesktopSidebarCollapsed(false);
                         if (isFreightMenu) setIsFreightMenuExpanded(true);
                         if (isDriversMenu) setIsDriversMenuExpanded(true);
                       } else {
                         setActiveTab(item.id);
                       }
                     }}
                     className={`w-full flex items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                       isActive ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                     }`}
                     title={item.label}
                   >
                     <Icon className="w-6 h-6" />
                   </button>
                 );
              }
              
              // Menu expansível de Gestão de Fretes (apenas para não-caminhoneiros)
              if (isFreightMenu && user.userType !== 'caminhoneiro') {
                return (
                  <div key={item.id}>
                    {/* Botão Principal de Gestão de Fretes */}
                    <button
                      onClick={() => setIsFreightMenuExpanded(!isFreightMenuExpanded)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        isFreightSubItemActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${isFreightSubItemActive ? 'text-primary' : 'text-gray-500'}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      {isFreightMenuExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {/* Sub-botões de Fretes */}
                    {isFreightMenuExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                        {/* Botão Criar Frete */}
                        <button
                          onClick={() => {
                            setActiveTab('freight-registration');
                            setIsSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                            activeTab === 'freight-registration'
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <Plus className={`w-4 h-4 ${activeTab === 'freight-registration' ? 'text-white' : 'text-gray-500'}`} />
                          <span className="text-sm">Criar Frete</span>
                        </button>

                        {user.userType !== 'caminhoneiro' && (
                          <button
                            onClick={() => setActiveTab('my-freights')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                              activeTab === 'my-freights'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <UserIcon className={`w-4 h-4 ${activeTab === 'my-freights' ? 'text-white' : 'text-gray-500'}`} />
                            <span className="text-sm">Meus Fretes</span>
                          </button>
                        )}

                        <button
                          onClick={() => setActiveTab('all-freights')}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                            activeTab === 'all-freights'
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <FileText className={`w-4 h-4 ${activeTab === 'all-freights' ? 'text-white' : 'text-gray-500'}`} />
                          <span className="text-sm">{user.userType === 'caminhoneiro' ? 'Fretes' : 'Todos os Fretes'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
              
              // Menu expansível de Motoristas (apenas para não-caminhoneiros)
              if (isDriversMenu && user.userType !== 'caminhoneiro') {
                return (
                  <div key={item.id}>
                    {/* Botão Principal de Motoristas */}
                    <button
                      onClick={() => setIsDriversMenuExpanded(!isDriversMenuExpanded)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        isDriversSubItemActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${isDriversSubItemActive ? 'text-primary' : 'text-gray-500'}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      {isDriversMenuExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {/* Sub-botões de Motoristas */}
                    {isDriversMenuExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                        <button
                          onClick={() => setActiveTab('all-drivers')}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                            activeTab === 'all-drivers'
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <Users className={`w-4 h-4 ${activeTab === 'all-drivers' ? 'text-white' : 'text-gray-500'}`} />
                          <span className="text-sm">Todos os Motoristas</span>
                        </button>

                        <button
                          onClick={() => setActiveTab('published-routes')}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                            activeTab === 'published-routes'
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <Navigation className={`w-4 h-4 ${activeTab === 'published-routes' ? 'text-white' : 'text-gray-500'}`} />
                          <span className="text-sm">Rotas Publicadas</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
              
              // Para outros itens e para caminhoneiros
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
          
          {/* Support & Logout Section */}
          <div className="p-4 border-t border-gray-100 space-y-2">
            {/* WhatsApp Support Button */}
            <button
              onClick={() => {
                const phoneNumber = '556493226356';
                const message = 'Olá! Preciso de ajuda com o MooveFretes.';
                const encodedMessage = encodeURIComponent(message);
                const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
                window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
              }}
              className={`w-full flex items-center ${isDesktopSidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl text-left transition-all duration-200 text-gray-600 hover:bg-green-50 hover:text-green-600`}
              title={isDesktopSidebarCollapsed ? "Suporte WhatsApp" : undefined}
            >
              <HelpCircle className="w-5 h-5 text-gray-500 group-hover:text-green-600 transition-colors" />
              {!isDesktopSidebarCollapsed && <span className="text-sm font-medium">Suporte</span>}
            </button>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)} />
            <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border">
              <div className="flex items-center justify-between h-16 px-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <img 
                    src={logoMaisFrete} 
                    alt="MaisFrete" 
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <nav className="p-4 space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === item.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header moved to top */}

          {/* Content Area */}
          <main className="flex-1 overflow-auto flex flex-col">
            <div className="flex-1">
              {(activeTab === 'freight-management' || activeTab === 'my-freights' || activeTab === 'all-freights' || activeTab === 'drivers' || activeTab === 'settings') ? (
                renderContent()
              ) : (
                <div className="">
                  {renderContent()}
                </div>
              )}
            </div>
            
            <footer className="py-6 text-center mt-auto border-t border-border/40 bg-background/50 backdrop-blur-sm">
              <p className="text-[11px] font-medium text-muted-foreground/70 tracking-wide">
                © 2026 • Desenvolvido por Amplie Marketing. Todos os direitos reservados.
              </p>
            </footer>
          </main>

          {/* Mobile Bottom Navigation */}
          <div className="lg:hidden bg-card border-t border-border">
            <div className="grid grid-cols-5 gap-1 py-2 px-2">
              {[
                { id: 'dashboard', icon: Home, label: 'Início' },
                { id: 'freight-management', icon: Package, label: 'Fretes' },
                { id: 'drivers', icon: Users, label: user.userType === 'caminhoneiro' ? 'Empresas' : 'Motoristas' },
                { id: 'chat', icon: MessageSquare, label: 'Chat' },
                { id: 'profile', icon: UserIcon, label: 'Perfil' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                      activeTab === item.id
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
        
        {/* Notification Sheet - Painel Lateral */}
        <NotificationScreen 
          open={showNotifications}
          onOpenChange={setShowNotifications}
        />
      </div>
    </AutoSyncWrapper>
  );
}