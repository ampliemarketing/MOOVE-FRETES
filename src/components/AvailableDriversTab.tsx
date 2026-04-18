import React, { useState, useEffect } from 'react';
import { formatRouteSlash, formatLocation, isValidLocation } from '../utils/location-helpers';
import { validateRoutes } from '../utils/freight-validator';
import { Search, MapPin, Star, Phone, MessageCircle, Briefcase, Calendar, Filter, X, CheckCircle, Activity, Heart, RefreshCw, Truck, Package, Users, Navigation, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { CityAutocomplete } from './CityAutocomplete';
import { toast } from 'sonner@2.0.3';
import { database } from '../utils/database';
import { DriverDetailScreen } from './DriverDetailScreen';
import { ImageWithFallback } from './ImageWithFallback';
import { copyToClipboard } from '../utils/clipboard-helper';
import { useAllActivePreferredRoutes } from '../utils/database/hooks';
import type { User } from './contexts/AppContext';
import { ToolbarHeader } from './ToolbarHeader';
import { LocationSelector } from './LocationSelector';
import { motion } from 'motion/react';
import { getAvatarUrl } from '../utils/storage-helper';
import { generateDeepLinkUrl } from '../utils/deep-link';
import { DriverDetailsSheet } from './DriverDetailsSheet';

interface AvailableDriversTabProps {
  currentUser: User;
  onOpenChat?: (driverId: string, driverName: string, prefilledMessage?: string) => void;
}

interface DriverInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  rating?: number;
  completedTrips?: number;
  vehicleType?: string;
  trailerType?: string;
  currentLocation?: { city: string; state: string; lat?: number; lng?: number }; // 🆕 Localização atual do motorista
}

export function AvailableDriversTab({ currentUser, onOpenChat }: AvailableDriversTabProps) {
  const { routes, loading, error } = useAllActivePreferredRoutes();
  const [driversInfo, setDriversInfo] = React.useState<Record<string, DriverInfo>>({});
  const [loadingDrivers, setLoadingDrivers] = React.useState(true);

  // Estados de filtro - expandidos para incluir todos os filtros da tela de motoristas
  const [showFilters, setShowFilters] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filters, setFilters] = React.useState({
    origin: '', // Armazena "Cidade, UF" completo
    destination: '', // Armazena "Cidade, UF" completo
    vehicleTypes: [] as string[],
    trailerTypes: [] as string[],
    minRating: '',
  });

  // Carregar informações dos motoristas
  React.useEffect(() => {
    const loadDriversInfo = async () => {
      // Se o hook principal ainda está carregando, não fazer nada
      if (loading) {
        return;
      }

      // Se não há rotas, setar loading como false
      if (!routes.length) {
        setLoadingDrivers(false);
        setDriversInfo({});
        return;
      }

      setLoadingDrivers(true);

      const driverIds = [...new Set(routes.map(r => r.driverId))];
      
      // 🚀 OTIMIZAÇÃO: Carregar todos os motoristas em paralelo em vez de sequencial
      const driversDataPromises = driverIds.map(async (driverId) => {
        try {
          // Buscar informações do usuário e perfil em paralelo
          const [userResponse, driverResponse] = await Promise.all([
            database.users.getById(driverId),
            database.drivers.getByUserId(driverId)
          ]);
          
          if (userResponse.success && userResponse.data) {
            const user = userResponse.data;
            const driverProfile = driverResponse.success ? driverResponse.data : null;

            // 🔍 DEBUG: Log detalhado do avatar

            return {
              driverId,
              data: {
                id: driverId,
                name: user.name,
                email: user.email,
                phone: user.phone,
                avatar: driverProfile?.avatarUrl || user.profile?.avatar,
                rating: driverProfile?.rating,
                completedTrips: driverProfile?.completedTrips,
                vehicleType: driverProfile?.vehicleType,
                trailerType: driverProfile?.trailerType,
                currentLocation: driverProfile?.currentLocation, // 🆕 Localização atual do motorista
              }
            };
          }
        } catch (err) {
          console.error('Erro ao carregar info do motorista:', driverId, err);
        }
        return null;
      });

      // Aguardar todas as chamadas em paralelo
      const driversResults = await Promise.all(driversDataPromises);
      
      // Transformar array em objeto
      const driversData: Record<string, DriverInfo> = {};
      driversResults.forEach(result => {
        if (result) {
          driversData[result.driverId] = result.data;
        }
      });

      setDriversInfo(driversData);
      setLoadingDrivers(false);
    };

    loadDriversInfo();
  }, [routes, loading]);

  const handleContact = (driver: DriverInfo, route: any) => {
    if (driver.phone) {
      // Gerar saudação baseada na hora do dia
      const hour = new Date().getHours();
      let greeting = 'Bom dia';
      if (hour >= 12 && hour < 18) {
        greeting = 'Boa tarde';
      } else if (hour >= 18) {
        greeting = 'Boa noite';
      }

      const companyName = currentUser?.name || 'Nossa Empresa';
      const companyId = currentUser?.id || '';
      
      const today = new Date().toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      
      const message = `*Olá ${driver.name}, sou ${companyName} e tenho um frete que pode combinar com sua rota ${formatRouteSlash(route.origin, route.destination)}.*

📦 *Rota publicada:*
${generateDeepLinkUrl('route', route.id)}

👤 *Seu perfil:*
${generateDeepLinkUrl('profile', driver.id)}

👤 *Meu perfil:*
${generateDeepLinkUrl('profile', companyId)}

*A rota ainda está disponível?* 🚚`;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=55${driver.phone.replace(/\\D/g, '')}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      toast.error('Telefone não disponível');
    }
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, { label: string; className: string }> = {
      high: { label: 'Alta', className: 'bg-red-500 text-white' },
      medium: { label: 'Média', className: 'bg-yellow-500 text-white' },
      low: { label: 'Baixa', className: 'bg-blue-500 text-white' },
    };

    const info = map[priority] || map.medium;
    return null;
  };

  // Filtrar rotas com base nos filtros aplicados
  const filteredRoutes = React.useMemo(() => {
    return routes.filter((route) => {
      const driver = driversInfo[route.driverId];
      if (!driver) return false;

      // Busca por nome, cidade ou veículo
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = driver.name.toLowerCase().includes(term);
        const matchesCity = 
          (route.origin?.city?.toLowerCase().includes(term)) ||
          (route.destination?.city?.toLowerCase().includes(term)) ||
          (driver.currentLocation?.city?.toLowerCase().includes(term));
        const matchesVehicle = driver.vehicleType?.toLowerCase().includes(term);
        if (!matchesName && !matchesCity && !matchesVehicle) return false;
      }

      // Normalizar strings para comparação (remover pontuação e espaços extras)
      const normalizeLocation = (str: string) => str.toLowerCase().replace(/[-,]/g, ' ').replace(/\s+/g, ' ').trim();

      // ✅ Filtro de origem (cidade, UF) - verifica rota.origin OU driver.currentLocation
      if (filters.origin) {
        const filterOrigin = normalizeLocation(filters.origin);
        
        // Verificar se a rota inicia na origem filtrada
        const routeOriginString = normalizeLocation(`${route.origin?.city || ''} ${route.origin?.state || ''}`);
        const matchesRouteOrigin = routeOriginString.includes(filterOrigin);
        
        // OU verificar se a localização atual do motorista é a origem filtrada
        const driverLocationString = driver.currentLocation 
          ? normalizeLocation(`${driver.currentLocation.city || ''} ${driver.currentLocation.state || ''}`)
          : '';
        const matchesDriverLocation = driverLocationString.includes(filterOrigin);
        
        if (!matchesRouteOrigin && !matchesDriverLocation) {
          return false;
        }
      }

      // ✅ Filtro de destino (cidade, UF) - verifica route.destination
      if (filters.destination) {
        const filterDestination = normalizeLocation(filters.destination);
        const destinationString = normalizeLocation(`${route.destination?.city || ''} ${route.destination?.state || ''}`);
        if (!destinationString.includes(filterDestination)) {
          return false;
        }
      }

      // Filtro de tipo de veículo
      if (filters.vehicleTypes.length > 0 && driver.vehicleType) {
        if (!filters.vehicleTypes.includes(driver.vehicleType)) {
          return false;
        }
      }

      // Filtro de tipo de carroceria
      if (filters.trailerTypes.length > 0 && driver.trailerType) {
        if (!filters.trailerTypes.includes(driver.trailerType)) {
          return false;
        }
      }

      // Filtro de avaliação mínima
      if (filters.minRating && driver.rating) {
        const minRating = parseFloat(filters.minRating);
        if (driver.rating < minRating) return false;
      }

      return true;
    });
  }, [routes, driversInfo, searchTerm, filters]);

  // ✅ PRÉ-PROCESSAR URLs com useMemo (performance optimization)
  // Converte PATH → URL apenas quando lista muda (não a cada render)
  // MOVIDO PARA NÍVEL DO COMPONENTE para evitar violação da Regra dos Hooks
  const routesWithUrls = React.useMemo(() => {
    if (filteredRoutes.length === 0) return [];
    
    
    return filteredRoutes.map(route => {
      const driver = driversInfo[route.driverId];
      if (!driver) return { route, driver: null, computedAvatarUrl: null };
      
      const path = driver.avatar;
      let computedAvatarUrl = null;
      
      if (path) {
        if (path.startsWith('http')) {
          computedAvatarUrl = path;
        } else {
          computedAvatarUrl = getAvatarUrl(path);
        }
      }
      
      return {
        route,
        driver,
        computedAvatarUrl
      };
    });
  }, [filteredRoutes, driversInfo]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      origin: '',
      destination: '',
      vehicleTypes: [],
      trailerTypes: [],
      minRating: '',
    });
  };

  const hasActiveFilters = searchTerm || 
    Object.values(filters).some(v => 
      (Array.isArray(v) && v.length > 0) || 
      (!Array.isArray(v) && v !== '')
    );

  const activeFiltersCount =
    (filters.origin ? 1 : 0) +
    (filters.destination ? 1 : 0) +
    filters.vehicleTypes.length +
    filters.trailerTypes.length +
    (filters.minRating ? 1 : 0);

  // Helpers para filtros
  const toggleListFilter = (key: 'vehicleTypes' | 'trailerTypes', item: string) => {
    const currentList = filters[key];
    const newList = currentList.includes(item)
      ? currentList.filter(i => i !== item)
      : [...currentList, item];
    setFilters({ ...filters, [key]: newList });
  };

  const handleToggleSingleSelect = (key: 'minRating', value: string) => {
    if (filters[key] === value) {
      setFilters({ ...filters, [key]: '' });
    } else {
      setFilters({ ...filters, [key]: value });
    }
  };

  // Estilo customizado para checkboxes \"sem cor interna\" (outline style)
  const checkboxStyle = "bg-transparent border-gray-300 data-[state=checked]:bg-transparent data-[state=checked]:text-primary data-[state=checked]:border-primary";

  // Estado para o perfil do motorista (DriverDetailsSheet)
  const [selectedDriverForProfile, setSelectedDriverForProfile] = React.useState<any>(null);
  const [showDriverProfile, setShowDriverProfile] = React.useState(false);

  // Estado de favoritos
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());

  // Carregar favoritos do usuário
  React.useEffect(() => {
    if (!currentUser?.id) return;
    
    const loadFavorites = async () => {
      try {
        const response = await database.favorites.getUserFavorites(currentUser.id);
        if (response.success && response.data) {
          setFavorites(new Set(response.data));
        }
      } catch (error) {
        console.error('❌ Erro ao buscar favoritos:', error);
      }
    };

    loadFavorites();
  }, [currentUser?.id]);

  // Computed: motorista selecionado é favorito?
  const isSelectedDriverFavorited = React.useMemo(() => {
    if (!selectedDriverForProfile) return false;
    return favorites.has(selectedDriverForProfile.id);
  }, [selectedDriverForProfile, favorites]);

  // Toggle favorito do motorista selecionado
  const handleToggleFavorite = async () => {
    if (!selectedDriverForProfile || !currentUser?.id) return;
    
    const driverId = selectedDriverForProfile.id;
    const isFav = favorites.has(driverId);
    const newFavorites = new Set(favorites);
    
    try {
      if (isFav) {
        const response = await database.favorites.removeFavorite(currentUser.id, driverId);
        if (response.success) {
          newFavorites.delete(driverId);
          setFavorites(newFavorites);
          toast.success(`${selectedDriverForProfile.name} removido dos favoritos`);
        }
      } else {
        const response = await database.favorites.addFavorite(currentUser.id, driverId);
        if (response.success) {
          newFavorites.add(driverId);
          setFavorites(newFavorites);
          toast.success(`${selectedDriverForProfile.name} adicionado aos favoritos!`);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      toast.error('Erro ao atualizar favorito');
    }
  };

  // Handler para abrir o perfil do motorista
  const handleOpenDriverProfile = (driver: DriverInfo, avatarUrl: string | null) => {
    // Converter DriverInfo para o formato esperado pelo DriverDetailsSheet
    const driverData = {
      id: driver.id,
      user_id: driver.id,
      name: driver.name,
      rating: driver.rating || 0,
      totalTrips: driver.completedTrips || 0,
      reviewCount: 0,
      level: 1,
      verified: true,
      availability: 'available' as const,
      avatarUrl: avatarUrl || undefined,
      phone: driver.phone || '',
      location: {
        city: driver.currentLocation?.city || '',
        state: driver.currentLocation?.state || '',
        coordinates: [
          driver.currentLocation?.lat || -15.7801,
          driver.currentLocation?.lng || -47.9292,
        ] as [number, number],
      },
      lastSeen: new Date().toISOString(),
      vehicleModel: driver.vehicleType || '',
      licensePlate: '',
      specialties: [] as string[],
      operatingStates: [] as string[],
      preferredRoutes: [] as string[],
    };
    setSelectedDriverForProfile(driverData);
    setShowDriverProfile(true);
  };

  // Helpers para DriverDetailsSheet
  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'available': return 'Disponível';
      case 'busy': return 'Ocupado';
      case 'offline': return 'Offline';
      default: return 'Desconhecido';
    }
  };

  const handleWhatsAppContactSheet = (driver: any) => {
    if (driver.phone) {
      const whatsappUrl = `https://api.whatsapp.com/send?phone=55${driver.phone.replace(/\D/g, '')}`;
      window.open(whatsappUrl, '_blank');
    } else {
      toast.error('Telefone não disponível');
    }
  };

  const handleCopyPhoneSheet = (driver: any) => {
    if (driver.phone) {
      copyToClipboard(driver.phone);
      toast.success('Telefone copiado!');
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto">
      {/* Barra de ferramentas padronizada */}
      <ToolbarHeader
        searchPlaceholder="Buscar motorista por nome"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        showFilterButton={false}
        onFilterClick={() => {}}
        activeFiltersCount={activeFiltersCount}
        onRefresh={() => window.location.reload()}
        isRefreshing={loading}
        totalCount={filteredRoutes.length}
        countLabel="motorista"
      />

      <div className="px-6 pt-4">
        {/* Layout com Sidebar de Filtros - igual ao DriversScreen */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
          {/* Sidebar de Filtros - Sempre visível em desktop */}
          <aside className="hidden md:block bg-card rounded-lg border p-4 h-fit sticky top-24 shadow-sm">
            <div className="space-y-6">{/* Removido pr-2 pois não há mais scroll */}
              {/* Título da Sidebar */}
              <div>
                <h3 className="font-semibold text-base mb-1">Filtros</h3>
                <p className="text-xs text-muted-foreground">Refine sua busca por rotas</p>
              </div>

              {/* Filtro de Origem */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Origem</Label>
                <CityAutocomplete
                  label=""
                  value={filters.origin}
                  onValueChange={(city, state) => {
                    setFilters({ ...filters, origin: city ? `${city} - ${state}` : '' });
                  }}
                  placeholder="Digite a cidade de origem"
                />
              </div>

              {/* Filtro de Destino */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Destino (opcional)</Label>
                <CityAutocomplete
                  label=""
                  value={filters.destination}
                  onValueChange={(city, state) => {
                    setFilters({ ...filters, destination: city ? `${city} - ${state}` : '' });
                  }}
                  placeholder="Digite a cidade de destino"
                />
              </div>

              <Separator />

              {/* Veículo */}
              <section className="space-y-4">
                <h3 className="font-semibold text-sm">Veículo</h3>
                
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-900">Pesados</h4>
                  <div className="space-y-2 pl-1">
                    {['Carreta', 'Carreta LS', 'Vanderléia', 'Bitrem', 'Rodotrem'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`vehicle-${type}`} 
                          checked={filters.vehicleTypes.includes(type)}
                          onCheckedChange={() => toggleListFilter('vehicleTypes', type)}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`vehicle-${type}`} className="font-normal text-sm text-gray-600">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-900">Médios</h4>
                  <div className="space-y-2 pl-1">
                    {['Truck', 'Bitruck'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`vehicle-${type}`} 
                          checked={filters.vehicleTypes.includes(type)}
                          onCheckedChange={() => toggleListFilter('vehicleTypes', type)}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`vehicle-${type}`} className="font-normal text-sm text-gray-600">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-900">Leves</h4>
                  <div className="space-y-2 pl-1">
                    {['Fiorino', 'VLC', '3/4', 'Toco'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`vehicle-${type}`} 
                          checked={filters.vehicleTypes.includes(type)}
                          onCheckedChange={() => toggleListFilter('vehicleTypes', type)}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`vehicle-${type}`} className="font-normal text-sm text-gray-600">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <Separator />

              {/* Carroceria */}
              <section className="space-y-4">
                <h3 className="font-semibold text-sm">Carroceria</h3>
                
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-900">Abertas</h4>
                  <div className="space-y-2 pl-1">
                    {['Graneleiro', 'Grade Baixa', 'Prancha', 'Caçamba', 'Plataforma'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`trailer-${type}`} 
                          checked={filters.trailerTypes.includes(type)}
                          onCheckedChange={() => toggleListFilter('trailerTypes', type)}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`trailer-${type}`} className="font-normal text-sm text-gray-600">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-900">Fechadas</h4>
                  <div className="space-y-2 pl-1">
                    {['Sider', 'Baú', 'Baú Frigorífico', 'Baú Refrigerado'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`trailer-${type}`} 
                          checked={filters.trailerTypes.includes(type)}
                          onCheckedChange={() => toggleListFilter('trailerTypes', type)}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`trailer-${type}`} className="font-normal text-sm text-gray-600">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-900">Especiais</h4>
                  <div className="space-y-2 pl-1">
                    {['Silo', 'Cegonheiro', 'Gaiola', 'Tanque', 'Bug Porta Container', 'Munk', 'Apenas Cavalo', 'Cavaqueira', 'Hopper'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`trailer-${type}`} 
                          checked={filters.trailerTypes.includes(type)}
                          onCheckedChange={() => toggleListFilter('trailerTypes', type)}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`trailer-${type}`} className="font-normal text-sm text-gray-600">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <Separator />

              {/* Avaliação Mínima */}
              <section className="space-y-3">
                <h3 className="font-semibold text-sm">Avaliação Mínima</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Todas', value: '' },
                    { label: '4+ estrelas', value: '4' },
                    { label: '4.5+ estrelas', value: '4.5' }
                  ].map((option) => {
                    const isChecked = filters.minRating === option.value;
                    return (
                      <div key={option.value || 'all'} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`rating-${option.value || 'all'}`} 
                          checked={isChecked}
                          onCheckedChange={() => handleToggleSingleSelect('minRating', option.value)}
                          className={checkboxStyle}
                        />
                        <Label htmlFor={`rating-${option.value || 'all'}`} className="font-normal text-sm text-gray-600">{option.label}</Label>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Botão de Limpar Filtros */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </aside>

          {/* Lista de motoristas com rotas */}
          <div>
            {/* Badges de filtros ativos (mobile) */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-4 lg:hidden">
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1">
                    Busca: {searchTerm}
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.origin && (
                  <Badge variant="secondary" className="gap-1">
                    Origem: {filters.origin}
                    <button
                      onClick={() => setFilters({ ...filters, origin: '' })}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.destination && (
                  <Badge variant="secondary" className="gap-1">
                    Destino: {filters.destination}
                    <button
                      onClick={() => setFilters({ ...filters, destination: '' })}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.vehicleTypes.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    Veículos: {filters.vehicleTypes.join(', ')}
                    <button
                      onClick={() => setFilters({ ...filters, vehicleTypes: [] })}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.trailerTypes.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    Carrocerias: {filters.trailerTypes.join(', ')}
                    <button
                      onClick={() => setFilters({ ...filters, trailerTypes: [] })}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.minRating && (
                  <Badge variant="secondary" className="gap-1">
                    Avaliação: {filters.minRating}+
                    <button
                      onClick={() => setFilters({ ...filters, minRating: '' })}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            <div className="space-y-4 mb-6">
              {filteredRoutes.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                      <Search className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-foreground mb-2">
                      Nenhum motorista encontrado
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Não há motoristas que correspondam aos filtros aplicados. Tente ajustar os critérios de busca.
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={clearFilters}>
                        Limpar Filtros
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                // ✅ URLs já pré-processadas pelo useMemo no nível do componente
                routesWithUrls.map(({ route, driver, computedAvatarUrl: driverAvatarUrl }, index) => {
                  if (!driver) return null;

                    return (
                    <motion.div
                      key={route.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-all duration-200">
                        <CardContent className="p-4">
                          {/* Layout: Avatar + Info | Botões */}
                          <div className="flex items-start justify-between gap-4">
                            
                            {/* Coluna Esquerda - Avatar + Info do Motorista */}
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {/* Avatar com status online */}
                              <button
                                type="button"
                                onClick={() => handleOpenDriverProfile(driver, driverAvatarUrl)}
                                className="relative flex-shrink-0 cursor-pointer group/avatar"
                                title={`Ver perfil de ${driver.name}`}
                              >
                                {driverAvatarUrl ? (
                                  <img
                                    src={driverAvatarUrl}
                                    alt={driver.name}
                                    className="w-12 h-12 rounded-full object-cover bg-gray-100 ring-2 ring-transparent group-hover/avatar:ring-primary/40 transition-all"
                                    onError={(e) => {
                                      // [REVISAR] console.warn('❌ Erro ao carregar avatar do motorista:', driver.avatar?.substring(0, 50));
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextElementSibling) {
                                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center ring-2 ring-transparent group-hover/avatar:ring-primary/40 transition-all"
                                  style={{ display: driverAvatarUrl ? 'none' : 'flex' }}
                                >
                                  <span className="text-white font-semibold text-base">
                                    {driver.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                {/* Bolinha verde de status online */}
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              </button>

                              {/* Informações do Motorista e Rota */}
                              <div className="flex-1 min-w-0 space-y-2">
                                {/* Nome com verificação */}
                                <div className="flex items-center gap-1.5">
                                  <h3
                                    className="font-semibold text-base text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => handleOpenDriverProfile(driver, driverAvatarUrl)}
                                    title={`Ver perfil de ${driver.name}`}
                                  >
                                    {driver.name}
                                  </h3>
                                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                </div>

                                {/* Origem */}
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                                  <span className="text-sm text-foreground font-medium">
                                    {formatLocation(route.origin)}
                                  </span>
                                </div>

                                {/* Destino */}
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full border-2 border-primary flex-shrink-0"></div>
                                  <span className="text-sm text-foreground font-medium">
                                    {formatLocation(route.destination)}
                                  </span>
                                </div>

                                {/* Tipo de veículo e observações */}
                                <div className="space-y-1">
                                  {driver.vehicleType && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Truck className="w-3 h-3" />
                                      <span>{driver.vehicleType}</span>
                                    </div>
                                  )}
                                  {route.notes && route.notes.trim() && (
                                    <p className="text-xs text-muted-foreground italic line-clamp-1">
                                      '{route.notes}'
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Coluna Direita - Botões de Ação */}
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <Button
                                onClick={() => {
                                  
                                  if (onOpenChat) {
                                    // Criar mensagem pré-pronta sobre a rota
                                    const today = new Date().toLocaleDateString('pt-BR', { 
                                      day: '2-digit', 
                                      month: '2-digit', 
                                      year: 'numeric' 
                                    });
                                    
                                    const prefilledMessage = `*Olá, vi sua rota ${formatLocation(route.origin)}/${formatLocation(route.destination)}.*\n\nTenho um *frete que pode te interessar.*\n\n📦 *Rota:*\n${generateDeepLinkUrl('route', route.id)}\n\n🚛 *Seu perfil:*\n${generateDeepLinkUrl('profile', driver.id)}\n\nPodemos conversar? 🚚`;
                                    
                                    // [REVISAR] console.log('📤 [AvailableDriversTab] Chamando onOpenChat com:', {
                                    // driverId: driver.id,
                                    // driverName: driver.name,
                                    // messagePreview: prefilledMessage.substring(0, 100) + '...',
                                    // });
                                    
                                    onOpenChat(driver.id, driver.name, prefilledMessage);
                                  } else {
                                    toast.info('Abrindo chat...');
                                  }
                                }}
                                className="bg-primary hover:bg-primary/90 text-white h-9 min-w-[100px]"
                              >
                                <MessageCircle className="w-4 h-4 mr-1.5" />
                                Chat
                              </Button>
                              <Button
                                onClick={() => handleContact(driver, route)}
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-50 h-9 min-w-[100px]"
                                disabled={!driver.phone}
                              >
                                <MessageCircle className="w-4 h-4 mr-1.5" />
                                WhatsApp
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Contador */}
            <div className="text-center text-sm text-muted-foreground">
              {filteredRoutes.length} motorista{filteredRoutes.length !== 1 ? 's' : ''} disponíve{filteredRoutes.length !== 1 ? 'is' : 'l'}
            </div>
          </div>
        </div>
      </div>

      {/* DriverDetailsSheet */}
      <DriverDetailsSheet
        open={showDriverProfile}
        onOpenChange={setShowDriverProfile}
        driver={selectedDriverForProfile}
        isFavorited={isSelectedDriverFavorited}
        onToggleFavorite={handleToggleFavorite}
        onOpenChat={onOpenChat ? (driverId, driverName) => onOpenChat(driverId, driverName) : undefined}
        onWhatsAppContact={handleWhatsAppContactSheet}
        onCopyPhone={handleCopyPhoneSheet}
        onOpenRating={() => {}}
        getTimeAgo={getTimeAgo}
        getAvailabilityColor={getAvailabilityColor}
        getAvailabilityText={getAvailabilityText}
      />
    </div>
  );
}