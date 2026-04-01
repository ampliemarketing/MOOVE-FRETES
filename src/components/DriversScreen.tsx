import React, { useState, useEffect, useMemo } from 'react';
import { formatRouteSlash, formatLocation, isValidLocation } from '../utils/location-helpers';
import { validateRoutes } from '../utils/freight-validator';
import { Search, MapPin, Star, Phone, MessageCircle, Filter, ChevronDown, Users, Briefcase, Calendar, Building2, X, RefreshCw, Eye, TrendingUp, MapPinned, Navigation, Mail, Shield, Clock, CheckCircle, Truck, User as UserIcon, Trophy, Target, Heart, Award, Copy, Route, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { database } from '../utils/database';
import { motion, AnimatePresence } from 'motion/react';
import { LocationSelector } from './LocationSelector';
import { ToolbarHeader } from './ToolbarHeader';
import { DriverDetailScreen } from './DriverDetailScreen';
import { ImageWithFallback } from './ImageWithFallback';
import { copyToClipboard } from '../utils/clipboard-helper';
import { useAvailableDrivers } from '../utils/database/hooks';
import { LoadingSpinner } from './LoadingSpinner';
import { AvailableDriversTab } from './AvailableDriversTab';
import { DriverLocationMap } from './DriverLocationMap';
import { DriverFilters, initialDriverFiltersState, DriverFiltersState } from './driver/DriverFilters';
import type { User as AppUser } from './contexts/AppContext';
import type { UnifiedUserProfile } from '../utils/user-profile-helper';
import { RatingDialog } from './RatingDialog';
import { DriverDetailsSheet } from './DriverDetailsSheet';
import { haversineDistance, getCityCoordinates } from '../utils/geo-utils';
import { generateDeepLinkUrl } from '../utils/deep-link';
import { getAvatarUrl } from '../utils/storage-helper';

// Função para calcular tempo desde última atividade
const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const lastSeen = new Date(dateString);
  const diffMs = now.getTime() - lastSeen.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (minutes < 1) {
    return 'agora mesmo';
  } else if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  } else if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  } else if (days < 7) {
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  } else if (weeks < 4) {
    return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  } else if (months < 12) {
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  } else {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  }
};

interface Driver {
  id: string;
  user_id?: string; // ✅ auth.users ID para favoritos
  name: string;
  phone: string;
  email?: string;
  rating: number;
  totalTrips: number;
  avatarUrl?: string;
  vehicleModel: string;
  licensePlate: string;
  location: {
    city: string;
    state: string;
    coordinates?: [number, number];
  };
  destination?: {
    city: string;
    state: string;
  };
  availability: 'available' | 'busy' | 'offline';
  verified: boolean;
  level: number;
  lastSeen: string;
  memberSince: string;
  preferredRoutes: string[];
  operatingStates: string[];
  specialties: string[];
  priceRange: {
    min: number;
    max: number;
  };
  reviewCount: number;
  availabilityExpiresAt?: string;
}

interface DriversScreenProps {
  onBack: () => void;
  initialFilters?: {
    freightId?: string;
    origin?: string;
    destination?: string;
  };
  initialView?: 'all-drivers' | 'published-routes';
  user?: AppUser;
  onOpenChat?: (userId: string, userName: string, prefilledMessage?: string) => void;
  initialSelectedDriverId?: string | null;
}

export function DriversScreen({ onBack, initialFilters, initialView, user, onOpenChat, initialSelectedDriverId }: DriversScreenProps) {
  // ✅ REMOVIDO: Sistema de abas - agora mostra apenas "Todos os Motoristas"
  // As "Rotas Publicadas" estão em componente separado (PublishedRoutesScreen)
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [selectedTrailerType, setSelectedTrailerType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showDriverDetails, setShowDriverDetails] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'distance' | 'trips'>('rating');
  const [isFavorited, setIsFavorited] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  
  // Estados para perfil unificado
  const [selectedUserProfile, setSelectedUserProfile] = useState<UnifiedUserProfile | null>(null);
  const [showUnifiedProfile, setShowUnifiedProfile] = useState(false);
  
  // 🎯 Estado para filtros do sidebar (igual ao FreightFilters)
  const [driverFilters, setDriverFilters] = useState<DriverFiltersState>(initialDriverFiltersState);
  
  // ✅ REMOVIDO: useEffect que atualizava activeTab baseado em initialView
  // Não precisamos mais disso pois não há abas
  
  // Integração com banco de dados
  const { drivers: dbDrivers, loading, refresh, error } = useAvailableDrivers();
  const [driversWithRoutes, setDriversWithRoutes] = useState<Driver[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  
  // 🔍 DEBUG: Verificar se onOpenChat está chegando
  useEffect(() => {
    console.log('🟢 [DriversScreen] Props recebidas:', {
      hasOnOpenChat: !!onOpenChat,
      onOpenChatType: typeof onOpenChat,
      hasUser: !!user,
      userId: user?.id,
      userName: user?.name
    });
  }, [onOpenChat, user]);
  
  // Carregar favoritos do usuário
  useEffect(() => {
    if (!user?.id) return;
    
    const loadFavorites = async () => {
      setLoadingFavorites(true);
      try {
        const response = await database.favorites.getUserFavorites(user.id);
        if (response.success && response.data) {
          setFavorites(new Set(response.data));
        }
      } catch (error) {
        console.error('❌ Erro ao buscar favoritos:', error);
      } finally {
        setLoadingFavorites(false);
      }
    };

    loadFavorites();
  }, [user?.id]);

  // Atualizar isFavorited quando selectedDriver mudar
  useEffect(() => {
    if (selectedDriver) {
      setIsFavorited(favorites.has(selectedDriver.user_id || selectedDriver.id));
    }
  }, [selectedDriver, favorites]);

  // Carregar rotas preferidas dos motoristas
  useEffect(() => {
    // Evitar re-render se já estamos carregando ou se não há drivers
    if (isLoadingRoutes || !dbDrivers || dbDrivers.length === 0) {
      if (!dbDrivers || dbDrivers.length === 0) {
        setDriversWithRoutes([]);
      }
      return;
    }

    const loadDriversWithRoutes = async () => {
      setIsLoadingRoutes(true);

      // 🚀 OTIMIZAÇÃO: Carregar todas as rotas de uma vez em vez de uma por motorista
      const allRoutesResponse = await database.preferredRoutes.getAllActive();
      const allRoutes = allRoutesResponse.success && allRoutesResponse.data ? allRoutesResponse.data : [];
      
      // Validar rotas antes de processar
      const validRoutes = validateRoutes(allRoutes, false);
      
      // Criar um mapa de rotas por motorista para acesso rápido
      const routesByDriver = new Map<string, string[]>();
      validRoutes.forEach(route => {
        const routeStr = formatRouteSlash(route.origin, route.destination);
        if (!routesByDriver.has(route.driverId)) {
          routesByDriver.set(route.driverId, []);
        }
        routesByDriver.get(route.driverId)!.push(routeStr);
      });

      // 🚀 OTIMIZAÇÃO: Carregar todas as estatísticas de avaliação de uma vez
      const ratingsStats = new Map<string, { count: number; avgRating: number }>();
      for (const d of dbDrivers) {
        const ratingsResponse = await database.ratings.getByDriver(d.id);
        if (ratingsResponse.success && ratingsResponse.data) {
          const ratings = ratingsResponse.data;
          const count = ratings.length;
          const avgRating = count > 0 
            ? ratings.reduce((sum, r) => sum + r.overallRating, 0) / count 
            : 0;
          ratingsStats.set(d.id, { count, avgRating });
        }
      }

      // Processar motoristas usando o mapa de rotas
      const driversData = dbDrivers.map((d) => {
        const routes = routesByDriver.get(d.id) || [];
        const stats = ratingsStats.get(d.id) || { count: 0, avgRating: 0 };

        return {
          id: d.id,
          user_id: d.user_id, // ✅ CORRIGIDO: Adicionar user_id para uso no chat
          name: d.name,
          phone: d.phone || '(00) 0000-0000',
          rating: stats.avgRating || d.rating || 0,
          totalRatings: stats.count || 0, // ✅ ADICIONADO: contador de avaliações
          totalTrips: d.totalTrips || 0,
          vehicleModel: d.vehicle?.model || 'Não especificado',
          licensePlate: d.vehicle?.plate || 'N/A',
          avatarUrl: d.avatarUrl, // Adicionado para avatar do motorista
          location: {
            city: d.currentLocation?.city || 'Desconhecido',
            state: d.currentLocation?.state || 'N/A',
            coordinates: [d.currentLocation?.lng || 0, d.currentLocation?.lat || 0] as [number, number],
          },
          availability: d.status as 'available' | 'busy' | 'offline',
          verified: Boolean(d.cnh),
          level: 1,
          lastSeen: d.currentLocation?.lastUpdated || d.createdAt || new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Usa createdAt ou 1 dia atrás como fallback
          memberSince: d.createdAt,
          preferredRoutes: routes,
          operatingStates: [],
          specialties: [d.vehicle?.type || 'Carga Geral'],
          priceRange: { min: 0, max: 0 },
          reviewCount: stats.count,
        } as Driver;
      });

      setDriversWithRoutes(driversData);
      setIsLoadingRoutes(false);
    };

    loadDriversWithRoutes();
  }, [dbDrivers]);
  
  const driversFromDB = driversWithRoutes;

  // Usar APENAS drivers do banco de dados (SEM fallback para mock)
  const drivers = driversFromDB;

  // 🔍 DEBUG: Log para verificar quantos motoristas estão sendo carregados
  useEffect(() => {
    console.log('📊 [DriversScreen] Total de motoristas:', {
      dbDrivers: dbDrivers?.length || 0,
      driversWithRoutes: driversWithRoutes.length,
      drivers: drivers.length
    });
  }, [dbDrivers, driversWithRoutes, drivers]);

  const filteredDrivers = drivers.filter(driver => {
    // ✅ Filtro de busca por texto
    const matchesSearch = !searchTerm || 
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.location.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.vehicleModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    // ✅ Filtro de localização (origem) - verifica localização atual OU rotas preferidas
    const matchesLocation = !driverFilters.location.city || 
      // Verifica localização atual do motorista
      (driver.location.city.toLowerCase().includes(driverFilters.location.city.toLowerCase()) &&
       driver.location.state.toLowerCase().includes(driverFilters.location.state.toLowerCase())) ||
      // OU verifica se há rotas preferidas que iniciam nesta localização
      driver.preferredRoutes.some(route => {
        const [origin] = route.split(' → ');
        const originLower = origin.toLowerCase();
        return originLower.includes(driverFilters.location.city.toLowerCase()) &&
               originLower.includes(driverFilters.location.state.toLowerCase());
      });

    // ✅ Filtro de destino (opcional) - usando driverFilters
    const matchesDestination = !driverFilters.destination.city || 
      driver.preferredRoutes.some(route => {
        const routeLower = route.toLowerCase();
        const searchCity = driverFilters.destination.city.toLowerCase();
        const searchState = driverFilters.destination.state.toLowerCase();
        return routeLower.includes(searchCity) && routeLower.includes(searchState);
      });

    // ✅ Filtro de raio (distância) - requer origem selecionada + coordenadas do motorista
    let matchesRadius = true;
    if (driverFilters.radius && driverFilters.location.city && driver.location.coordinates) {
      const originCoords = getCityCoordinates(driverFilters.location.city, driverFilters.location.state);
      if (originCoords) {
        const [driverLng, driverLat] = driver.location.coordinates;
        // Ignorar motoristas sem coordenadas válidas (0,0)
        if (driverLat !== 0 || driverLng !== 0) {
          const distance = haversineDistance(
            originCoords.lat, originCoords.lng,
            driverLat, driverLng
          );
          matchesRadius = distance <= parseInt(driverFilters.radius);
        }
      }
    }

    // ✅ Filtro de disponibilidade - sidebar E toolbar badges combinados
    const sidebarAvailabilityPass = 
      !driverFilters.availability || 
      driverFilters.availability === 'todos' || 
      driver.availability === driverFilters.availability;
    const badgeAvailabilityPass = 
      !selectedAvailability || 
      selectedAvailability === 'all' || 
      driver.availability === selectedAvailability;
    const matchesAvailability = sidebarAvailabilityPass && badgeAvailabilityPass;

    // ✅ Filtro de verificação - usando driverFilters
    // DriverFilters gera: 'sim', 'nao', 'ambos' (via toLowerCase + normalize)
    const matchesVerified = 
      !driverFilters.verified || 
      driverFilters.verified === 'ambos' || 
      (driverFilters.verified === 'sim' && driver.verified) ||
      (driverFilters.verified === 'nao' && !driver.verified);

    // ✅ Filtro de avaliação mínima - usando driverFilters
    const matchesRating = !driverFilters.minRating || 
      driver.rating >= parseFloat(driverFilters.minRating);
    
    // ✅ Filtro por tipo de veículo - usando driverFilters E selectedVehicleType (fallback)
    const dbDriver = dbDrivers?.find(d => d.id === driver.id);
    const matchesVehicleType = 
      (driverFilters.vehicleTypes.length === 0 || 
       driverFilters.vehicleTypes.some(type => 
         (dbDriver?.vehicleTypes && dbDriver.vehicleTypes.includes(type)) ||
         driver.specialties.some(s => s.includes(type))
       )) &&
      (!selectedVehicleType || selectedVehicleType === 'all' || 
       (dbDriver?.vehicleTypes && dbDriver.vehicleTypes.includes(selectedVehicleType)) ||
       driver.specialties.some(s => s.includes(selectedVehicleType)));

    // ✅ Filtro por tipo de carroceria - usando driverFilters E selectedTrailerType (fallback)
    const matchesTrailerType = 
      (driverFilters.trailerTypes.length === 0 || 
       driverFilters.trailerTypes.some(type => 
         dbDriver?.trailerTypes && dbDriver.trailerTypes.includes(type)
       )) &&
      (!selectedTrailerType || selectedTrailerType === 'all' || 
       (dbDriver?.trailerTypes && dbDriver.trailerTypes.includes(selectedTrailerType)));

    // ⚠️ Filtro de estado (fallback antigo - mantido para compatibilidade)
    const matchesState = !selectedState || selectedState === 'all' || driver.location.state === selectedState;

    // ✅ Filtro de favoritos
    const matchesFavorites = !driverFilters.showOnlyFavorites || 
      favorites.has(driver.user_id || driver.id);

    return matchesSearch && matchesLocation && matchesDestination && matchesRadius && matchesAvailability && 
           matchesVerified && matchesRating && matchesVehicleType && matchesTrailerType && matchesState && matchesFavorites;
  });

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'price':
        return a.priceRange.min - b.priceRange.min;
      case 'distance':
        return 0; // Would calculate actual distance
      case 'trips':
        return b.totalTrips - a.totalTrips;
      default:
        return 0;
    }
  });

  // ✅ PRÉ-PROCESSAR URLs com useMemo (performance optimization)
  // Converte PATH → URL apenas quando lista muda (não a cada render)
  // MOVIDO PARA NÍVEL DO COMPONENTE para evitar violação da Regra dos Hooks
  const driversWithUrls = useMemo(() => {
    if (sortedDrivers.length === 0) return [];
    
    console.log('🔄 [DriversScreen] Pré-processando URLs para', sortedDrivers.length, 'motoristas');
    
    return sortedDrivers.map(driver => {
      const path = driver.avatarUrl;
      let computedAvatarUrl = null;
      
      if (path) {
        if (path.startsWith('http')) {
          computedAvatarUrl = path; // Já é URL (compatibilidade legado)
        } else {
          computedAvatarUrl = getAvatarUrl(path); // PATH → URL (usa cache)
        }
      }
      
      return {
        ...driver,
        computedAvatarUrl
      };
    });
  }, [sortedDrivers]);

  // 🔗 Auto-select driver from deep link
  useEffect(() => {
    if (initialSelectedDriverId && driversWithRoutes.length > 0) {
      const targetDriver = driversWithRoutes.find(d => d.id === initialSelectedDriverId);
      if (targetDriver) {
        console.log('🔗 [DriversScreen] Auto-selecionando motorista via deep link:', targetDriver.name);
        setSelectedDriver(targetDriver);
        setShowDriverDetails(true);
      } else {
        console.warn('🔗 [DriversScreen] Motorista não encontrado para deep link:', initialSelectedDriverId);
        toast.error('Motorista não encontrado');
      }
    }
  }, [initialSelectedDriverId, driversWithRoutes]);

  const handleDriverSelect = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowDriverDetails(true);
  };

  const handleWhatsAppContact = (driver: Driver) => {
    // Gerar saudação baseada na hora do dia
    const hour = new Date().getHours();
    let greeting = 'Bom dia';
    if (hour >= 12 && hour < 18) {
      greeting = 'Boa tarde';
    } else if (hour >= 18) {
      greeting = 'Boa noite';
    }

    const userName = user?.name || 'Usuário';
    const userId = user?.id || '';
    const userType = user?.userType === 'caminhoneiro' ? 'motorista' : 'empresa';
    
    const today = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    const message = `*Olá ${driver.name}, sou ${userName}.*

Tenho interesse em conversar sobre *fretes na sua região.*

🚛 *Seu perfil:*
${generateDeepLinkUrl('profile', driver.id)}

🏢 *Meu perfil:*
${generateDeepLinkUrl('profile', userId)}

*Você está disponível?* 📦`;

    const phone = driver.phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`;
    
    console.log('📱 [WhatsApp Debug] URL Final:', url);
    
    window.open(url, '_blank');
    toast.success(`Abrindo WhatsApp para ${driver.name}`);
  };

  const handleContractDriver = (driver: Driver) => {
    toast.success(`[Demo] Solicitação de contratação enviada para ${driver.name}!`);
    setShowDriverDetails(false);
  };

  const handleCopyPhone = (driver: Driver) => {
    copyToClipboard(driver.phone);
    toast.success('Telefone copiado para a área de transferência');
  };

  const handleToggleFavorite = async () => {
    if (!selectedDriver || !user?.id) return;
    
    // ✅ Usar user_id (auth.users ID) para favoritos, não drivers.id
    const favoriteId = selectedDriver.user_id || selectedDriver.id;
    const isFav = favorites.has(favoriteId);
    const newFavorites = new Set(favorites);
    
    try {
      if (isFav) {
        // Remover dos favoritos
        const response = await database.favorites.removeFavorite(user.id, favoriteId);
        if (response.success) {
          newFavorites.delete(favoriteId);
          setFavorites(newFavorites);
          toast.success(`${selectedDriver.name} removido dos favoritos`);
        }
      } else {
        // Adicionar aos favoritos
        const response = await database.favorites.addFavorite(user.id, favoriteId);
        if (response.success) {
          newFavorites.add(favoriteId);
          setFavorites(newFavorites);
          toast.success(`${selectedDriver.name} adicionado aos favoritos!`);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      toast.error('Erro ao atualizar favorito');
    }
  };

  const handleToggleFavoriteCard = async (e: React.MouseEvent, driverId: string, driverName: string) => {
    e.stopPropagation();
    if (!user?.id) {
      toast.error('Faça login para adicionar favoritos');
      return;
    }
    
    const isFav = favorites.has(driverId);
    const newFavorites = new Set(favorites);
    
    try {
      if (isFav) {
        // Remover dos favoritos
        const response = await database.favorites.removeFavorite(user.id, driverId);
        if (response.success) {
          newFavorites.delete(driverId);
          setFavorites(newFavorites);
          toast.success(`${driverName} removido dos favoritos`);
        }
      } else {
        // Adicionar aos favoritos
        const response = await database.favorites.addFavorite(user.id, driverId);
        if (response.success) {
          newFavorites.add(driverId);
          setFavorites(newFavorites);
          toast.success(`${driverName} adicionado aos favoritos!`);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      toast.error('Erro ao atualizar favorito');
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
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

  const states = ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'GO', 'DF', 'ES', 'BA'];

  return (
    <div className="h-full bg-background overflow-hidden flex flex-col">
      {/* ✅ REMOVIDO: Tabs de navegação - agora é tela única */}
      
      {/* Content - Apenas "Todos os Motoristas" */}
      <div>
        {/* Barra de ferramentas padronizada */}
        <ToolbarHeader
          searchPlaceholder="Buscar motorista por nome"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          showFilterButton={false}
          onFilterClick={() => {}}
          onRefresh={refresh}
          isRefreshing={loading}
          totalCount={sortedDrivers.length}
          countLabel="motorista"
          statusBadges={[
            {
              label: 'Disponíveis',
              count: drivers.filter(d => d.availability === 'available').length,
              isActive: selectedAvailability === 'available',
              onClick: () => setSelectedAvailability(selectedAvailability === 'available' ? '' : 'available')
            },
            {
              label: 'Ocupados',
              count: drivers.filter(d => d.availability === 'busy').length,
              isActive: selectedAvailability === 'busy',
              onClick: () => setSelectedAvailability(selectedAvailability === 'busy' ? '' : 'busy')
            },
            {
              label: 'Offline',
              count: drivers.filter(d => d.availability === 'offline').length,
              isActive: selectedAvailability === 'offline',
              onClick: () => setSelectedAvailability(selectedAvailability === 'offline' ? '' : 'offline')
            },
            {
              label: 'Favoritos',
              count: favorites.size,
              isActive: driverFilters.showOnlyFavorites,
              onClick: () => setDriverFilters({ ...driverFilters, showOnlyFavorites: !driverFilters.showOnlyFavorites })
            }
          ]}
        />

        <div className="p-[21px]">
          {showMap && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">Localização dos Motoristas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-64 relative">
                  {sortedDrivers.length > 0 && (
                    <DriverLocationMap
                      coordinates={sortedDrivers[0].location.coordinates}
                      cityName={`${sortedDrivers.length} motoristas na região`}
                      driverName="Motoristas MaisFrete"
                      className="h-full"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Layout com Sidebar de Filtros - igual ao FreightManagement */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar de Filtros - Visível apenas em desktop */}
            <div className="hidden lg:block bg-card rounded-lg border p-4 h-fit sticky top-24">
              <DriverFilters 
                filters={driverFilters} 
                onFilterChange={setDriverFilters}
                favoritesCount={favorites.size}
              />
            </div>

            {/* Drivers List */}
            <div className="space-y-3">
              {loading ? (
                <LoadingSpinner message="Carregando motoristas..." />
              ) : sortedDrivers.length === 0 ? (
                // Estado vazio
                <Card>
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                      <Truck className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900">Nenhum motorista disponível</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Não há motoristas cadastrados e disponíveis no momento. 
                        {searchTerm && ' Tente ajustar os filtros de busca.'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refresh}
                      className="mx-auto"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Atualizar
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                // ✅ URLs já pré-processadas pelo useMemo no nível do componente
                driversWithUrls.map((driver) => {
                  // ✅ URL já pré-processada (sem conversão aqui!)
                  const avatarUrl = driver.computedAvatarUrl;

                    return (
                    <Card 
                      key={driver.id}
                      className="hover:shadow-card-hover transition-all duration-200 border-light cursor-pointer"
                      onClick={() => handleDriverSelect(driver)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={driver.name}
                                className="w-12 h-12 rounded-full object-cover bg-gray-100"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div 
                              className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground"
                              style={{ display: avatarUrl ? 'none' : 'flex' }}
                            >
                              <UserIcon className="w-6 h-6" />
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getAvailabilityColor(driver.availability)} rounded-full border-2 border-white`}></div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-medium text-foreground">{driver.name}</h3>
                                  {driver.verified && (
                                    <CheckCircle className="w-4 h-4 text-blue-500" />
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                                  <div className="flex items-center space-x-1">
                                    <Star className="w-3 h-3 text-yellow-500" />
                                    <span>{driver.rating}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Trophy className="w-3 h-3" />
                                    <span>{driver.totalTrips} viagens</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Target className="w-3 h-3" />
                                    <span>Nível {driver.level}</span>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{driver.location.city}, {driver.location.state}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Truck className="w-3 h-3" />
                                    <span>{driver.vehicleModel}</span>
                                  </div>
                                </div>

                                {driver.destination && (
                                  <div className="flex items-center space-x-1 text-sm text-blue-600 mt-1">
                                    <Navigation className="w-3 h-3" />
                                    <span>→ {formatLocation(driver.destination)}</span>
                                  </div>
                                )}

                                {/* Rotas Publicadas - Destaque */}
                                {driver.preferredRoutes && driver.preferredRoutes.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                      <Navigation className="w-3 h-3" />
                                      <span>Rotas de Interesse</span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {driver.preferredRoutes.slice(0, 2).map((route, idx) => {
                                        const [origin, destination] = route.split(' → ');
                                        return (
                                          <div key={idx} className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 rounded-full bg-primary"></div>
                                              <span className="font-medium text-sm text-foreground">{origin}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 rounded-full border-2 border-primary"></div>
                                              <span className="font-medium text-sm text-foreground">{destination}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {driver.preferredRoutes.length > 2 && (
                                        <div className="text-xs text-primary font-medium pt-1">
                                          +{driver.preferredRoutes.length - 2} rota{driver.preferredRoutes.length - 2 > 1 ? 's' : ''}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="text-right">
                                <div className="flex flex-col gap-2 items-end justify-center">
                                  {/* Botão de Favorito */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => handleToggleFavoriteCard(e, driver.user_id || driver.id, driver.name)}
                                    className="h-9 w-9 hover:bg-red-50"
                                  >
                                    <Heart className={`w-5 h-5 ${favorites.has(driver.user_id || driver.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                                  </Button>
                                  
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log('🔵 [DriversScreen] Botão Chat clicado!', {
                                        hasOnOpenChat: !!onOpenChat,
                                        driverId: driver.id,
                                        driverUserId: driver.user_id,
                                        driverName: driver.name,
                                        willUse: driver.user_id || driver.id
                                      });
                                      if (onOpenChat) {
                                        // ✅ CORRIGIDO: usar user_id ao invés de id da tabela drivers
                                        onOpenChat(driver.user_id || driver.id, driver.name);
                                        console.log('✅ [DriversScreen] onOpenChat chamado com sucesso!');
                                      } else {
                                        console.error('❌ [DriversScreen] onOpenChat NÃO ESTÁ DEFINIDO!');
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleWhatsAppContact(driver);
                                    }}
                                    className="border-green-200 text-green-600 hover:bg-green-50 h-9 px-4 min-w-[120px]"
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
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Driver Details Sheet */}
      <DriverDetailsSheet
        open={showDriverDetails}
        onOpenChange={setShowDriverDetails}
        driver={selectedDriver}
        isFavorited={isFavorited}
        onToggleFavorite={handleToggleFavorite}
        onOpenChat={onOpenChat}
        onWhatsAppContact={handleWhatsAppContact}
        onCopyPhone={handleCopyPhone}
        onOpenRating={() => setShowRatingDialog(true)}
        getTimeAgo={getTimeAgo}
        getAvailabilityColor={getAvailabilityColor}
        getAvailabilityText={getAvailabilityText}
      />

      {/* OLD Sheet - to be removed */}
      <Sheet open={false} onOpenChange={() => {}}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <SheetTitle className="sr-only">
            {selectedDriver ? `Detalhes de ${selectedDriver.name}` : 'Detalhes do Motorista'}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {selectedDriver ? `Informações completas sobre o motorista ${selectedDriver.name}, incluindo localização, veículo, performance e contato.` : 'Visualize informações detalhadas sobre o motorista selecionado.'}
          </SheetDescription>
          {selectedDriver && (
            <div className="flex flex-col h-full">
              {/* Header Hero */}
              <div className="relative bg-gradient-to-br from-primary/5 via-background to-background p-6 pb-4 border-b">
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {selectedDriver.avatarUrl ? (
                      <img
                        src={selectedDriver.avatarUrl}
                        alt={selectedDriver.name}
                        className="w-16 h-16 rounded-full object-cover bg-gray-100 shadow-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white shadow-lg"
                      style={{ display: selectedDriver.avatarUrl ? 'none' : 'flex' }}
                    >
                      <UserIcon className="w-8 h-8" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${getAvailabilityColor(selectedDriver.availability)} rounded-full border-2 border-white`}>
                      <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h2 className="text-lg font-medium">{selectedDriver.name}</h2>
                          {selectedDriver.verified && (
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-3 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span>{selectedDriver.rating}</span>
                          </div>
                          <span>•</span>
                          <span>{selectedDriver.totalTrips} viagens</span>
                          <span>•</span>
                          <span>Nível {selectedDriver.level}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs">
                            <Trophy className="w-3 h-3 mr-1" />
                            Nível {selectedDriver.level}
                          </Badge>
                          <Badge 
                            variant={selectedDriver.availability === 'available' ? 'default' : 'secondary'} 
                            className={selectedDriver.availability === 'available' ? 'bg-green-500 hover:bg-green-600 text-xs' : 'text-xs'}
                          >
                            {getAvailabilityText(selectedDriver.availability)}
                          </Badge>
                        </div>
                      </div>

                      <Button variant="ghost" size="icon" onClick={handleToggleFavorite}>
                        <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-white rounded-lg p-2 text-center border">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Package className="w-3 h-3 text-blue-500" />
                      <span className="text-sm font-medium">{selectedDriver.totalTrips}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Viagens</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center border">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Award className="w-3 h-3 text-purple-500" />
                      <span className="text-sm font-medium">{selectedDriver.reviewCount}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Avaliações</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-b bg-white">
                <div className="grid grid-cols-4 gap-2">
                  <Button 
                    onClick={() => {
                      console.log('🔵 [DriversScreen Modal] Botão Chat clicado!', {
                        hasOnOpenChat: !!onOpenChat,
                        driverId: selectedDriver.id,
                        driverUserId: selectedDriver.user_id,
                        driverName: selectedDriver.name,
                        willUse: selectedDriver.user_id || selectedDriver.id
                      });
                      if (onOpenChat) {
                        // ✅ CORRIGIDO: usar user_id ao invés de id da tabela drivers
                        onOpenChat(selectedDriver.user_id || selectedDriver.id, selectedDriver.name);
                        console.log('✅ [DriversScreen Modal] onOpenChat chamado com sucesso!');
                      } else {
                        console.error('❌ [DriversScreen Modal] onOpenChat NÃO ESTÁ DEFINIDO!');
                      }
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-9"
                    size="sm"
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    Chat
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleWhatsAppContact(selectedDriver)}
                    className="border-green-200 text-green-600 hover:bg-green-50 text-sm h-9"
                    size="sm"
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    WhatsApp
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleCopyPhone(selectedDriver)}
                    className="text-sm h-9"
                    size="sm"
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Ligar
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowRatingDialog(true)}
                    className="text-sm h-9 border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                    size="sm"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Avaliar
                  </Button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                {/* Location Map */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>Localização Atual</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <DriverLocationMap
                      coordinates={selectedDriver.location.coordinates}
                      cityName={`${selectedDriver.location.city}, ${selectedDriver.location.state}`}
                      driverName={selectedDriver.name}
                      className="h-48 rounded-b-lg"
                    />
                  </CardContent>
                </Card>

                {/* Location Details */}
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>Localização</span>
                      </div>
                      <span className="font-medium">{selectedDriver.location.city}, {selectedDriver.location.state}</span>
                    </div>
                    
                    {selectedDriver.destination && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 text-blue-600">
                          <Navigation className="w-3 h-3" />
                          <span>Destino</span>
                        </div>
                        <span className="font-medium text-blue-600">
                          {formatLocation(selectedDriver.destination)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        <span>Última vez ativo</span>
                      </div>
                      <span className="font-medium">Há {getTimeAgo(selectedDriver.lastSeen)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Vehicle Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Truck className="w-4 h-4" />
                      <span>Informações do Veículo</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Modelo</div>
                        <div className="font-medium">{selectedDriver.vehicleModel}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Placa</div>
                        <div className="font-medium">{selectedDriver.licensePlate}</div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Especialidades</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedDriver.specialties.map((specialty, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs border-primary/20 text-primary">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Routes & Coverage */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Route className="w-4 h-4" />
                      <span>Rotas e Cobertura</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Estados de Atuação</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedDriver.operatingStates.map((state, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                            {state}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Rotas Preferenciais</div>
                      <div className="space-y-1">
                        {selectedDriver.preferredRoutes.map((route, idx) => (
                          <div key={idx} className="flex items-center space-x-2 p-1.5 bg-surface-50 rounded text-xs">
                            <Navigation className="w-3 h-3 text-primary" />
                            <span className="font-medium">{route}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>Contato</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-2 bg-surface-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <Phone className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{selectedDriver.phone}</div>
                          <div className="text-xs text-muted-foreground">Telefone principal</div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => handleCopyPhone(selectedDriver)} className="h-7 w-7 p-0">
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleWhatsAppContact(selectedDriver)} className="h-7 w-7 p-0 text-green-600">
                          <MessageCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      Membro desde {new Date(selectedDriver.memberSince).toLocaleDateString('pt-BR', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de Filtros Avançados */}
      <Dialog open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtros Avançados</DialogTitle>
            <DialogDescription>
              Refine sua busca para encontrar motoristas específicos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <DriverFilters 
              filters={driverFilters} 
              onFilterChange={setDriverFilters} 
            />
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                setDriverFilters(initialDriverFiltersState);
                toast.success('Filtros limpos');
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => {
                setShowAdvancedFilters(false);
                const filterCount = Object.values(driverFilters).filter(v => 
                  typeof v === 'string' ? v !== '' && v !== 'todos' && v !== 'ambos' : 
                  Array.isArray(v) ? v.length > 0 : 
                  typeof v === 'object' && v !== null ? v.city !== '' || v.state !== '' :
                  false
                ).length;
                if (filterCount > 0) {
                  toast.success(`${filterCount} filtro(s) aplicado(s)`);
                }
              }}
            >
              Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Avaliação */}
      {user && selectedDriver && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          targetUser={{
            id: selectedDriver.id,
            name: selectedDriver.name,
            type: 'caminhoneiro'
          }}
          currentUser={user}
          onSuccess={async () => {
            // Fechar dialog após sucesso
            setShowRatingDialog(false);
            toast.success('Avaliação enviada!');
            
            // 🔄 RECARREGAR a lista de motoristas para atualizar o reviewCount
            console.log('🔄 [DriversScreen] Recarregando motoristas após avaliação...');
            await refresh();
          }}
        />
      )}
    </div>
  );
}