import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useApp } from './contexts/AppContext';
import { useAuth } from './contexts/AuthContext';
import type { User } from './contexts/AppContext';
import { getAvatarUrl } from '../utils/storage-helper';
import { AutoSyncWrapper } from './AutoSyncWrapper';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { NotificationScreen } from './NotificationScreen';
import { PageHelpModal } from './PageHelpModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
  HelpCircle,
  FileText,
  DollarSign,
  Plus,
  Navigation,
} from 'lucide-react';
import logoMaisFrete from '../assets/logo-moovefretes.png';
import { getActiveMenuId, getActiveBottomNavId, isFreightSubItemActive, isDriversSubItemActive } from '../utils/navigation-helpers';
import type { DeepLink } from '../utils/deep-link';

export function AppLayout() {
  const { state } = useApp();
  const { user: authUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [updateTrigger, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const user = useMemo(() => {
    return (state.user || authUser) as User;
  }, [state.user, authUser, updateTrigger]);

  const userAvatarUrl = useMemo(() => getAvatarUrl(user?.avatar), [user?.avatar]);

  const resolvedCompanyId = user?.collaborator?.companyId || user?.id;
  const isCollaborator = !!user?.collaborator;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isFreightMenuExpanded, setIsFreightMenuExpanded] = useState(false);
  const [isDriversMenuExpanded, setIsDriversMenuExpanded] = useState(false);

  useEffect(() => {
    const handleProfileUpdate = () => forceUpdate();
    window.addEventListener('user-profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('user-profile-updated', handleProfileUpdate);
  }, []);

  // 🔗 Global deep link handler for ChatMessageItem and other components
  const navigateRef = React.useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any)._handleDeepLinkNavigation = (deepLink: DeepLink) => {
        const nav = navigateRef.current;
        switch (deepLink.type) {
          case 'driver':
            nav(`/perfil/${deepLink.id}`);
            break;
          case 'profile':
            nav(`/perfil/${deepLink.id}`);
            break;
          case 'company':
            nav(`/perfil/${deepLink.id}`);
            break;
          case 'freight':
            nav(`/fretes/${deepLink.id}`);
            break;
          case 'chat':
            nav('/chat', { state: { userId: deepLink.id } });
            break;
          case 'route':
            nav('/rotas');
            break;
          case 'post':
            nav('/social');
            break;
          default:
            nav('/');
        }
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any)._handleDeepLinkNavigation;
      }
    };
  }, []);

  // Auto-expand submenus based on current route
  useEffect(() => {
    const pathname = location.pathname;
    if (isFreightSubItemActive(pathname)) {
      setIsFreightMenuExpanded(true);
    }
    if (isDriversSubItemActive(pathname)) {
      setIsDriversMenuExpanded(true);
    }
  }, [location.pathname]);

  const activeMenuId = getActiveMenuId(location.pathname);
  const activeBottomNavId = getActiveBottomNavId(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation map: menu ID → route path
  const navMap: Record<string, string> = {
    'dashboard': '/',
    'freight-management': '/fretes',
    'freight-registration': '/fretes/novo',
    'my-freights': '/fretes/meus',
    'all-freights': '/fretes',
    'history': '/fretes/historico',
    'transaction': '/financeiro',
    'drivers': '/motoristas',
    'all-drivers': '/motoristas',
    'companies': '/empresas',
    'preferred-routes': '/rotas',
    'published-routes': '/motoristas/rotas',
    'chat': '/chat',
    'social': '/social',
    'profile': '/perfil',
    'settings': '/configuracoes',
    'collaborators': '/colaboradores',
    'activity-logs': '/logs',
  };

  const navigateTo = (menuId: string) => {
    const path = navMap[menuId] || '/';
    navigate(path);
  };

  if (!user) return null;

  const menuItems = [
    ...(user.userType !== 'caminhoneiro' ? [
      { id: 'dashboard', label: 'Início', icon: Home },
    ] : []),
    { id: 'freight-management', label: user.userType === 'caminhoneiro' ? 'Fretes' : 'Gestão de Fretes', icon: Package },
    ...(user.userType !== 'caminhoneiro' ? [
      { id: 'my-freights', label: 'Meus Fretes', icon: Package },
    ] : []),
    { id: 'all-freights', label: user.userType === 'caminhoneiro' ? 'Fretes' : 'Todos os Fretes', icon: Package },
    ...(user.userType === 'caminhoneiro' ? [
      { id: 'preferred-routes', label: 'Rotas de Interesse', icon: MapPin }
    ] : []),
    ...(user.userType !== 'caminhoneiro' ? [
      { id: 'history', label: 'Histórico', icon: Clock },
    ] : []),
    {
      id: 'drivers',
      label: user.userType === 'caminhoneiro' ? 'Transportadoras' : 'Motoristas',
      icon: Users
    },
    { id: 'all-drivers', label: 'Todos os Motoristas', icon: Users },
    { id: 'published-routes', label: 'Rotas Publicadas', icon: Navigation },
    { id: 'chat', label: 'Chat', icon: MessageSquare }
    // { id: 'social', label: 'Rede Social', icon: Heart } // temporariamente removido
  ];

  // Get current page title
  const currentItem = menuItems.find(item => item.id === activeMenuId);
  // Also check special routes not in menuItems
  const getPageTitle = () => {
    if (currentItem) return { label: currentItem.label, Icon: currentItem.icon };
    switch (activeMenuId) {
      case 'transaction': return { label: 'Financeiro', Icon: DollarSign };
      case 'collaborators': return { label: 'Colaboradores', Icon: Users };
      case 'activity-logs': return { label: 'Logs de Atividades', Icon: FileText };
      case 'settings': return { label: 'Configurações', Icon: Settings };
      default: return null;
    }
  };
  const pageTitle = getPageTitle();

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

            <div className="flex items-center">
              <img src={logoMaisFrete} alt="MaisFrete" className="h-8 w-auto object-contain" />
            </div>

          </div>

          <div className="flex items-center gap-2">
            {pageTitle && (() => {
              const { Icon, label } = pageTitle;
              return (
                <div className="flex items-center gap-2 mr-1">
                  <PageHelpModal pageId={activeMenuId} />
                  <Icon className="w-5 h-5 text-primary" />
                  <h1 className="font-medium hidden sm:block">{label}</h1>
                </div>
              );
            })()}
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
                      {user.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-0 shadow-xl border-0">
                {/* Header */}
                <div className="bg-gradient-to-br from-primary to-primary/90 p-6 rounded-t-lg">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-14 h-14 border-2 border-white shadow-md">
                      <AvatarImage src={userAvatarUrl || undefined} />
                      <AvatarFallback className="bg-white text-primary text-lg font-semibold">
                        {user.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-base mb-1 truncate">{user.name}</p>
                      <p className="text-white/80 text-xs mb-3 truncate">{user.email}</p>
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
                    onClick={() => navigate('/perfil')}
                    className="mx-2 rounded-lg px-3 py-2.5 cursor-pointer"
                  >
                    <UserIcon className="mr-3 h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Meu Perfil</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate('/configuracoes')}
                    className="mx-2 rounded-lg px-3 py-2.5 cursor-pointer"
                  >
                    <Settings className="mr-3 h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Configurações</span>
                  </DropdownMenuItem>

                  {(user.userType === 'transportadora' || user.userType === 'agenciador') && (
                    <>
                      <DropdownMenuItem
                        onClick={() => navigate('/colaboradores')}
                        className="mx-2 rounded-lg px-3 py-2.5 cursor-pointer"
                      >
                        <Users className="mr-3 h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Colaboradores</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => navigate('/logs')}
                        className="mx-2 rounded-lg px-3 py-2.5 cursor-pointer"
                      >
                        <FileText className="mr-3 h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Logs de Atividades</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </div>

                <DropdownMenuSeparator className="my-1" />

                <div className="py-2">
                  <DropdownMenuItem className="mx-2 rounded-lg px-3 py-2.5 cursor-pointer">
                    <HelpCircle className="mr-3 h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Ajuda &amp; Suporte</span>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="my-1" />

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
          {/* Desktop Sidebar */}
          <div className={`hidden lg:flex lg:flex-col ${isDesktopSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'} lg:bg-white lg:border-r lg:border-gray-200 lg:shadow-sm transition-all duration-300`}>
            <div className="flex items-center justify-center transition-all duration-300">
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex ml-auto mr-2"
                onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
              >
                <Menu className={`w-5 h-5 transition-transform duration-300 ${isDesktopSidebarCollapsed ? 'rotate-90' : ''}`} />
              </Button>
            </div>

            <nav className={`flex-1 p-4 space-y-1 overflow-y-auto ${isDesktopSidebarCollapsed ? 'px-2' : 'px-4'}`}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isFreightMenu = item.id === 'freight-management';
                const isDriversMenu = item.id === 'drivers';
                const freightSubActive = isFreightSubItemActive(location.pathname);
                const isActive = activeMenuId === item.id
                  || (isFreightMenu && freightSubActive);
                const driversSubActive = isDriversSubItemActive(location.pathname);

                const subItemsToSkip = ['my-freights', 'all-freights', 'all-drivers', 'published-routes'];
                if (subItemsToSkip.includes(item.id)) return null;

                if (isDesktopSidebarCollapsed) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (isFreightMenu || isDriversMenu) {
                          setIsDesktopSidebarCollapsed(false);
                          if (isFreightMenu) setIsFreightMenuExpanded(true);
                          if (isDriversMenu) setIsDriversMenuExpanded(true);
                        } else {
                          navigateTo(item.id);
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

                // Freight expandable menu
                if (isFreightMenu && user.userType !== 'caminhoneiro') {
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => setIsFreightMenuExpanded(!isFreightMenuExpanded)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                          freightSubActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${freightSubActive ? 'text-primary' : 'text-gray-500'}`} />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        {isFreightMenuExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      {isFreightMenuExpanded && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                          <button
                            onClick={() => { navigate('/fretes/novo'); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                              location.pathname === '/fretes/novo'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <Plus className={`w-4 h-4 ${location.pathname === '/fretes/novo' ? 'text-white' : 'text-gray-500'}`} />
                            <span className="text-sm">Criar Frete</span>
                          </button>

                          {user.userType !== 'caminhoneiro' && (
                            <button
                              onClick={() => navigate('/fretes/meus')}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                                location.pathname === '/fretes/meus'
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              <UserIcon className={`w-4 h-4 ${location.pathname === '/fretes/meus' ? 'text-white' : 'text-gray-500'}`} />
                              <span className="text-sm">Meus Fretes</span>
                            </button>
                          )}

                          <button
                            onClick={() => navigate('/fretes')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                              location.pathname === '/fretes' && !location.pathname.includes('/novo') && !location.pathname.includes('/meus')
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <FileText className={`w-4 h-4 ${location.pathname === '/fretes' ? 'text-white' : 'text-gray-500'}`} />
                            <span className="text-sm">{user.userType === 'caminhoneiro' ? 'Fretes' : 'Todos os Fretes'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                // Drivers expandable menu
                if (isDriversMenu && user.userType !== 'caminhoneiro') {
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => setIsDriversMenuExpanded(!isDriversMenuExpanded)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                          driversSubActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${driversSubActive ? 'text-primary' : 'text-gray-500'}`} />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        {isDriversMenuExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      {isDriversMenuExpanded && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                          <button
                            onClick={() => navigate('/motoristas')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                              location.pathname === '/motoristas'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <Users className={`w-4 h-4 ${location.pathname === '/motoristas' ? 'text-white' : 'text-gray-500'}`} />
                            <span className="text-sm">Todos os Motoristas</span>
                          </button>

                          <button
                            onClick={() => navigate('/motoristas/rotas')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                              location.pathname === '/motoristas/rotas'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <Navigation className={`w-4 h-4 ${location.pathname === '/motoristas/rotas' ? 'text-white' : 'text-gray-500'}`} />
                            <span className="text-sm">Rotas Publicadas</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                // Regular menu items
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
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

            {/* Support & Logout */}
            <div className="p-4 border-t border-gray-100 space-y-2">
              <button
                onClick={() => {
                  const phoneNumber = '556493226356';
                  const message = 'Olá! Preciso de ajuda com o MooveFretes.';
                  const encodedMessage = encodeURIComponent(message);
                  window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');
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
                    <img src={logoMaisFrete} alt="MaisFrete" className="h-8 w-auto object-contain" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <nav className="p-4 space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeMenuId === item.id;

                    // Skip sub-items in mobile sidebar (same as desktop)
                    const subItemsToSkip = ['my-freights', 'all-freights', 'all-drivers', 'published-routes'];
                    if (subItemsToSkip.includes(item.id)) return null;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigateTo(item.id);
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          isActive
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
            <main className="flex-1 overflow-auto flex flex-col">
              <div className="flex-1">
                <Outlet />
              </div>

              <footer className="py-6 text-center mt-auto border-t border-border/40 bg-background/50 backdrop-blur-sm">
                <p className="text-[11px] font-medium text-muted-foreground/70 tracking-wide">
                  &copy; 2026 &bull; Desenvolvido por Amplie Marketing. Todos os direitos reservados.
                </p>
              </footer>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="lg:hidden bg-card border-t border-border">
              <div className="grid grid-cols-5 gap-1 py-2 px-2">
                {(user.userType === 'caminhoneiro' ? [
                  { id: 'freight-management', path: '/fretes', icon: Package, label: 'Fretes' },
                  { id: 'preferred-routes', path: '/rotas', icon: MapPin, label: 'Rotas' },
                  { id: 'drivers', path: '/motoristas', icon: Users, label: 'Empresas' },
                  { id: 'chat', path: '/chat', icon: MessageSquare, label: 'Chat' },
                  { id: 'profile', path: '/perfil', icon: UserIcon, label: 'Perfil' },
                ] : [
                  { id: 'dashboard', path: '/', icon: Home, label: 'Início' },
                  { id: 'freight-management', path: '/fretes', icon: Package, label: 'Fretes' },
                  { id: 'drivers', path: '/motoristas', icon: Users, label: 'Motoristas' },
                  { id: 'chat', path: '/chat', icon: MessageSquare, label: 'Chat' },
                  { id: 'profile', path: '/perfil', icon: UserIcon, label: 'Perfil' },
                ]).map((item) => {
                  const Icon = item.icon;
                  const isActive = activeBottomNavId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                        isActive
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

        {/* Notification Sheet */}
        <NotificationScreen
          open={showNotifications}
          onOpenChange={setShowNotifications}
        />
      </div>
    </AutoSyncWrapper>
  );
}