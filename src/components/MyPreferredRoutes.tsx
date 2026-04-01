/**
 * Tela para motorista visualizar e gerenciar suas rotas de interesse
 * Segue o mesmo padrão visual da tela de fretes
 */

import React, { useState, useEffect } from 'react';
import { formatRouteSlash, formatLocation, isValidLocation, isSameLocation } from '../utils/location-helpers';
import { validateRoutes } from '../utils/freight-validator';
import { 
  MapPin, 
  Plus, 
  ToggleLeft, 
  ToggleRight,
  Search,
  RefreshCw,
  Navigation,
  Trash2,
  MoreHorizontal,
  AlertCircle,
  MessageCircle,
  Phone,
  User,
  Star,
  Truck,
  Package,
  DollarSign,
  CheckCircle,
  Trophy,
  Target
} from 'lucide-react';
import { useMyPreferredRoutes } from '../utils/hooks/usePreferredRoutesRealtime';
import type { PreferredRoute } from '../utils/database/schema';
import { motion } from 'motion/react';
import { useApp } from './contexts/AppContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { LoadingSpinner } from './LoadingSpinner';
import { getSupabaseClient } from '../utils/supabase/client';
import { ToolbarHeader } from './ToolbarHeader';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { RouteFilters, initialRouteFiltersState, RouteFiltersState } from './routes/RouteFilters';

interface MyPreferredRoutesProps {
  onAddRoute?: () => void;
  user?: { id: string; userType: string; name: string };
  viewMode?: 'personal' | 'public'; // personal = minhas rotas, public = rotas de motoristas
  onOpenChat?: (userId: string, userName: string) => void;
}

export function MyPreferredRoutes({ onAddRoute, user, viewMode = 'personal', onOpenChat }: MyPreferredRoutesProps) {
  const { state } = useApp();
  const currentUser = user || state.user;
  
  // ✅ Resolver companyId: se for colaborador, usar o companyId da empresa vinculada
  const resolvedCompanyId = (currentUser as any)?.collaborator?.companyId || currentUser?.id || '';
  
  // ✅ Determinar se é transportadora visualizando rotas públicas
  const isPublicView = viewMode === 'public' || currentUser?.userType === 'transportadora';
  const showAddButton = !isPublicView; // Apenas motoristas podem adicionar rotas
  
  const { routes, loading, deactivateRoute, reactivateRoute, deleteRoute, refresh } = useMyPreferredRoutes(
    isPublicView ? '' : (currentUser?.id || '') // Se for view pública, buscar todas as rotas
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [supabaseRouteCount, setSupabaseRouteCount] = useState<number | null>(null);
  const [checkingSync, setCheckingSync] = useState(false);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);
  
  // ✅ NOVO: Estado para armazenar dados dos motoristas
  const [driversData, setDriversData] = useState<Record<string, any>>({});
  
  // ✅ NOVO: Estado para controlar o Sheet lateral de perfil
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showDriverProfile, setShowDriverProfile] = useState(false);
  
  // ✅ NOVO: Estado para filtros (apenas para view pública)
  const [routeFilters, setRouteFilters] = useState<RouteFiltersState>(initialRouteFiltersState);
  
  // ✅ NOVO: Buscar dados dos motoristas quando for visualização pública
  useEffect(() => {
    if (!isPublicView || routes.length === 0) return;
    
    const fetchDriversData = async () => {
      const supabase = getSupabaseClient();
      const driverIds = [...new Set(routes.map(r => r.driverId))];
      
      console.log('🚚 Buscando dados de motoristas...', driverIds);
      
      try {
        // ✅ Buscar TUDO da tabela drivers (já tem name, phone, rating, completed_trips)
        const { data: driversData, error: driversError } = await supabase
          .from('drivers')
          .select('user_id, name, phone, rating, completed_trips, vehicle_type, vehicle_capacity')
          .in('user_id', driverIds);
        
        if (driversError) {
          console.error('❌ Erro ao buscar motoristas:', driversError);
          return;
        }
        
        // ✅ Organizar por user_id
        const driversMap: Record<string, any> = {};
        driversData?.forEach(driver => {
          driversMap[driver.user_id] = {
            user_id: driver.user_id,
            name: driver.name || 'Motorista',
            phone: driver.phone || '',
            rating: driver.rating || 0,
            completed_trips: driver.completed_trips || 0,
            vehicle_type: driver.vehicle_type,
            vehicle_capacity: driver.vehicle_capacity
          };
        });
        
        setDriversData(driversMap);
        console.log('✅ Dados de motoristas carregados:', driversMap);
      } catch (err) {
        console.error('❌ Erro ao buscar motoristas:', err);
      }
    };
    
    fetchDriversData();
  }, [isPublicView, routes]);
  
  // ✅ NOVO: Função para abrir WhatsApp
  const openWhatsApp = (phone: string, driverName: string, route: PreferredRoute) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const routeText = formatRouteSlash(route.origin, route.destination);
    const message = encodeURIComponent(
      `*Olá ${driverName}, vi sua rota ${routeText}.*\n\nTenho um *frete que pode te interessar.*\n\n📦 *Detalhes:*\n${generateDeepLinkUrl('route', route.id)}\n\n*Você está disponível?* 🚚`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };
  
  // ✅ NOVO: Função para abrir chat interno
  const openChat = (driverId: string, driverName: string) => {
    // Implementar navegação para o chat
    console.log('Abrir chat com:', driverId, driverName);
    // TODO: Navegar para tela de chat
  };
  
  // ✅ NOVO: Função para ver perfil completo
  const viewProfile = (driverId: string) => {
    setSelectedDriverId(driverId);
    setShowDriverProfile(true);
  };

  // Verificar quantas rotas estão no Supabase
  const checkSupabaseSync = async () => {
    if (!currentUser?.id) return;
    
    setCheckingSync(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setSupabaseRouteCount(0);
        return;
      }

      const { data, error } = await supabase
        .from('preferred_routes')
        .select('id', { count: 'exact' })
        .eq('driver_id', resolvedCompanyId)
        .eq('is_active', true);

      if (error) {
        console.error('Erro ao verificar rotas no Supabase:', error);
        setSupabaseRouteCount(null);
      } else {
        setSupabaseRouteCount(data?.length || 0);
      }
    } catch (err) {
      console.error('Erro ao verificar sincronização:', err);
      setSupabaseRouteCount(null);
    } finally {
      setCheckingSync(false);
    }
  };

  // Verificar sincronização ao carregar o componente
  useEffect(() => {
    checkSupabaseSync();
  }, [currentUser?.id, routes.length]);

  // Filtrar rotas ativas e inativas
  const activeRoutes = routes.filter(r => r.isActive);
  const inactiveRoutes = routes.filter(r => !r.isActive);
  const displayedRoutes = routes; // Sempre mostra todas as rotas juntas

  // Filtrar por busca E filtros avançados (apenas na view pública)
  const filteredRoutes = displayedRoutes.filter(route => {
    const searchLower = searchTerm.toLowerCase();
    
    // 1. Filtro de busca textual com validação
    const matchesSearch = 
      (isValidLocation(route.origin) && route.origin.city.toLowerCase().includes(searchLower)) ||
      (isValidLocation(route.origin) && route.origin.state.toLowerCase().includes(searchLower)) ||
      (isValidLocation(route.destination) && route.destination.city.toLowerCase().includes(searchLower)) ||
      (isValidLocation(route.destination) && route.destination.state.toLowerCase().includes(searchLower)) ||
      (route.notes && route.notes.toLowerCase().includes(searchLower));
    
    if (!matchesSearch) return false;
    
    // Se não for view pública, retorna apenas a busca textual
    if (!isPublicView) return true;
    
    // 2. Filtros avançados (apenas para view pública)
    const driver = driversData[route.driverId];
    if (!driver) return true; // Se ainda não carregou os dados do motorista, mostra a rota
    
    // Filtro de origem com validação
    if (routeFilters.origin.city && routeFilters.origin.state) {
      if (!isValidLocation(route.origin)) return false;
      const matchesOrigin = 
        route.origin.city.toLowerCase() === routeFilters.origin.city.toLowerCase() &&
        route.origin.state.toLowerCase() === routeFilters.origin.state.toLowerCase();
      if (!matchesOrigin) return false;
    }
    
    // Filtro de destino com validação
    if (routeFilters.destination.city && routeFilters.destination.state) {
      if (!isValidLocation(route.destination)) return false;
      const matchesDestination =
        route.destination.city.toLowerCase() === routeFilters.destination.city.toLowerCase() &&
        route.destination.state.toLowerCase() === routeFilters.destination.state.toLowerCase();
      if (!matchesDestination) return false;
    }
    
    // Filtro de tipo de veículo
    if (routeFilters.vehicleTypes.length > 0 && driver.vehicle_type) {
      const matchesVehicleType = routeFilters.vehicleTypes.includes(driver.vehicle_type);
      if (!matchesVehicleType) return false;
    }
    
    // Filtro de avaliação mínima
    if (routeFilters.minRating) {
      const minRating = parseFloat(routeFilters.minRating);
      if (driver.rating < minRating) return false;
    }
    
    return true;
  });

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const config = {
      high: { label: 'Alta Prioridade', color: 'bg-red-50 text-red-700 border-red-200' },
      medium: { label: 'Média Prioridade', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      low: { label: 'Baixa Prioridade', color: 'bg-blue-50 text-blue-700 border-blue-200' }
    };
    const { label, color } = config[priority];
    return null; // Badge removido
  };

  const handleToggleActive = async (route: PreferredRoute) => {
    if (route.isActive) {
      await deactivateRoute(route.id);
    } else {
      await reactivateRoute(route.id);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    setDeletingRouteId(routeId);
    await deleteRoute(routeId);
    setDeletingRouteId(null);
  };

  const handleOpenAddRoute = () => {
    if (onAddRoute) {
      onAddRoute();
    }
  };

  if (loading && routes.length === 0) {
    return <LoadingSpinner message="Carregando suas rotas..." />;
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">
      {/* Barra de ferramentas padronizada */}
      <ToolbarHeader
        searchPlaceholder="Buscar por cidade, estado ou observações..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        primaryAction={showAddButton ? {
          label: '',
          icon: <Plus className="w-4 h-4" />,
          onClick: handleOpenAddRoute,
          tooltip: 'Adicionar nova rota',
          variant: 'default',
          className: 'h-10 w-10 shrink-0 bg-primary hover:bg-primary/90'
        } : undefined}
        onFilterClick={() => {}} // Sem filtros avançados
        activeFiltersCount={0}
        showFilterButton={false} // Esconde o botão de filtros
        onRefresh={refresh}
        isRefreshing={loading}
        totalCount={filteredRoutes.length}
        countLabel="rota"
        statusBadges={[]} // ✅ Removido badges de status
        showActiveFiltersIndicator={false}
      />

      {/* Lista de rotas */}
      <div className="px-6 py-4">
        {filteredRoutes.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <Navigation className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              {routes.length === 0 ? (
                <>
                  {isPublicView ? (
                    <>
                      <p className="text-muted-foreground mb-2">Nenhum motorista publicou rotas ainda</p>
                      <p className="text-sm text-muted-foreground">
                        As rotas publicadas pelos motoristas aparecerão aqui
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-2">Você ainda não possui rotas de interesse cadastradas</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Cadastre rotas para que empresas saibam para onde você deseja ir
                      </p>
                      {showAddButton && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleOpenAddRoute}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Rota
                        </Button>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-2">Nenhuma rota encontrada</p>
                  <p className="text-sm text-muted-foreground">
                    Tente ajustar os filtros de busca
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          // ✅ NOVO: Layout com sidebar de filtros (apenas para view pública)
          isPublicView ? (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              {/* ✅ Sidebar de Filtros - Visível apenas em desktop */}
              <div className="hidden lg:block bg-card rounded-lg border p-4 h-fit sticky top-24">
                <RouteFilters
                  filters={routeFilters}
                  onFilterChange={setRouteFilters}
                />
              </div>

              {/* Lista de Rotas */}
              <div className="space-y-3">
                {filteredRoutes.map((route, index) => {
                  const driver = driversData[route.driverId];
                  const driverName = driver?.name || 'Motorista';
                  const driverPhone = driver?.phone || '';
                  const driverRating = driver?.rating || 0;
                  const driverTrips = driver?.completed_trips || 0;
                  
                  return (
                    <motion.div
                      key={route.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card 
                        className="hover:shadow-card-hover transition-all duration-200 border-light cursor-pointer"
                        onClick={() => viewProfile(route.driverId)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-4">
                            {/* Avatar do Motorista */}
                            <div className="relative flex-shrink-0">
                              <div 
                                className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewProfile(route.driverId);
                                }}
                              >
                                <User className="w-6 h-6" />
                              </div>
                              {/* Indicador de disponibilidade (verde = ativo) */}
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                            
                            {/* Informações */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {/* Nome + Verificado */}
                                  <div className="flex items-center space-x-2">
                                    <h3 className="font-medium text-foreground">{driverName}</h3>
                                    <CheckCircle className="w-4 h-4 text-blue-500" />
                                  </div>
                                  
                                  {/* Rating */}
                                  {driverRating > 0 && (
                                    <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
                                      <Star className="w-3 h-3 text-yellow-500" />
                                      <span>{driverRating.toFixed(1)}</span>
                                    </div>
                                  )}
                                  
                                  {/* Origem e Destino - formato de fretes */}
                                  <div className="mt-2 space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <div className="w-2 h-2 rounded-full bg-muted-foreground bg-[#000000]"></div>
                                      <span className="text-[#6b747c] text-[#636b72] text-[#5d646b] text-[#474b4e] text-[#2e3031] text-[#2d2f30] text-[#020202] text-[#010101] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] font-bold">{route.origin.city}, {route.origin.state}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <div className="w-2 h-2 rounded-full border-2 border-muted-foreground bg-[#00000000]"></div>
                                      <span className="text-[#6b7c8b] text-[#6c7c8b] text-[#434446] text-[#2d2d2d] text-[#121212] text-[#111111] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] text-[#000000] font-bold">{route.destination.city}, {route.destination.state}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Tipo de Veículo (se disponível) */}
                                  {driver?.vehicle_type && (
                                    <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-2">
                                      <Truck className="w-3 h-3" />
                                      <span>{driver.vehicle_type}</span>
                                    </div>
                                  )}
                                  
                                  {/* Observações (se houver) */}
                                  {route.notes && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      <span className="italic">"{route.notes}"</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Botões de Ação */}
                                <div className="text-right">
                                  <div className="flex flex-col gap-2 items-end justify-center">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onOpenChat) {
                                          onOpenChat(route.driverId, driverName);
                                        } else {
                                          openChat(route.driverId, driverName);
                                        }
                                      }}
                                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 min-w-[120px]"
                                    >
                                      <MessageCircle className="w-4 h-4 mr-2" />
                                      Chat
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={!driverPhone}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (driverPhone) {
                                          openWhatsApp(driverPhone, driverName, route);
                                        }
                                      }}
                                      className="border-green-200 text-green-600 hover:bg-green-50 h-9 px-4 min-w-[120px]"
                                      title={!driverPhone ? 'Telefone não disponível' : ''}
                                    >
                                      <MessageCircle className="w-4 h-4 mr-2" />
                                      WhatsApp
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Layout sem sidebar (view pessoal)
            <div className="space-y-3">
              {filteredRoutes.map((route, index) => (
                <motion.div
                  key={route.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className="relative bg-white rounded-xl border border-gray-200 p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                          <Navigation className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <span className="font-medium text-sm text-foreground">
                              {route.origin.city}, {route.origin.state}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full border-2 border-primary"></div>
                            <span className="font-medium text-sm text-foreground">
                              {route.destination.city}, {route.destination.state}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="font-medium">
                            Criada há {(() => {
                              const now = new Date();
                              const created = new Date(route.createdAt);
                              const diffMs = now.getTime() - created.getTime();
                              const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                              if (days < 1) return 'hoje';
                              if (days === 1) return '1 dia';
                              if (days < 7) return `${days} dias`;
                              const weeks = Math.floor(days / 7);
                              if (weeks === 1) return '1 semana';
                              if (weeks < 4) return `${weeks} semanas`;
                              const months = Math.floor(days / 30);
                              return `${months} ${months === 1 ? 'mês' : 'meses'}`;
                            })()}
                          </span>
                          {route.notes && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]">{route.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <div className="flex flex-col gap-2 w-[150px]">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(route);
                            }}
                            variant={route.isActive ? "outline" : "default"}
                            className="w-full justify-center"
                            size="sm"
                          >
                            {route.isActive ? (
                              <>
                                <ToggleLeft className="w-4 h-4 mr-1.5" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <ToggleRight className="w-4 h-4 mr-1.5" />
                                Reativar
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoute(route.id);
                            }}
                            variant="outline"
                            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-center"
                            disabled={deletingRouteId === route.id}
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            {deletingRouteId === route.id ? 'Excluindo...' : 'Excluir'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ✅ Sheet Lateral de Perfil do Motorista */}
      <Sheet open={showDriverProfile} onOpenChange={setShowDriverProfile}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <SheetTitle className="sr-only">
            {selectedDriverId && driversData[selectedDriverId] ? `Perfil de ${driversData[selectedDriverId].name}` : 'Perfil do Motorista'}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Informações completas sobre o motorista selecionado, incluindo dados de contato, veículo, avaliações e viagens completadas.
          </SheetDescription>
          
          {selectedDriverId && driversData[selectedDriverId] && (() => {
            const driver = driversData[selectedDriverId];
            const driverRoutes = routes.filter(r => r.driverId === selectedDriverId);
            
            return (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-primary/5 via-background to-background p-6 pb-4 border-b">
                  <div className="flex items-start space-x-4">
                    {/* Avatar */}
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                        {driver.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Info */}
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-foreground">{driver.name}</h2>
                      
                      {/* Rating e Viagens */}
                      <div className="flex items-center gap-4 mt-2">
                        {driver.rating > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-foreground">{driver.rating.toFixed(1)}</span>
                            <span className="text-sm text-muted-foreground">Avaliação</span>
                          </div>
                        )}
                        {driver.completed_trips > 0 && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <div className="flex items-center gap-1.5">
                              <Truck className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold text-foreground">{driver.completed_trips}</span>
                              <span className="text-sm text-muted-foreground">{driver.completed_trips === 1 ? 'viagem' : 'viagens'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Conteúdo */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Informações de Contato */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Contato</h3>
                    <div className="space-y-2">
                      {driver.phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{driver.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Informações do Veículo */}
                  {(driver.vehicle_type || driver.vehicle_capacity) && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">Veículo</h3>
                      <div className="space-y-2">
                        {driver.vehicle_type && (
                          <div className="flex items-center gap-3 text-sm">
                            <Truck className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">{driver.vehicle_type}</span>
                          </div>
                        )}
                        {driver.vehicle_capacity > 0 && (
                          <div className="flex items-center gap-3 text-sm">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">Capacidade: {driver.vehicle_capacity} kg</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Rotas Publicadas */}
                  {driverRoutes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        Rotas de Interesse ({driverRoutes.length})
                      </h3>
                      <div className="space-y-2">
                        {driverRoutes.map(route => (
                          <div 
                            key={route.id}
                            className="p-3 bg-muted/30 rounded-lg border border-border/50"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                <span className="font-medium text-foreground">
                                  {route.origin.city}, {route.origin.state}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full border-2 border-primary"></div>
                                <span className="font-medium text-foreground">
                                  {route.destination.city}, {route.destination.state}
                                </span>
                              </div>
                            </div>
                            {route.notes && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {route.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Footer - Botões de Ação */}
                <div className="p-6 border-t bg-background space-y-3">
                  {driver.phone && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                      onClick={() => {
                        const cleanPhone = driver.phone.replace(/\D/g, '');
                        const message = encodeURIComponent(
                          `*Olá ${driver.name}, sou ${currentUser?.name || 'Usuário'}.*\n\nVi seu perfil na MooveFretes e tenho interesse em *fretes com você.*\n\n🚛 *Seu perfil:*\n${generateDeepLinkUrl('profile', driver.id)}\n\n*Podemos conversar?* 📦`
                        );
                        window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
                      }}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Enviar WhatsApp
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      openChat(driver.user_id, driver.name);
                      setShowDriverProfile(false);
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Abrir Chat
                  </Button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}